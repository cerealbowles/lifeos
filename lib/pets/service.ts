import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { computeNextOccurrence } from "@/lib/tasks/recurrence";
import type { NewPet, NewPetEvent, PetEventType, RecurrenceConfig } from "@/lib/db/schema";

export async function listPets(userId: string) {
  return db
    .select()
    .from(schema.pets)
    .where(and(eq(schema.pets.userId, userId), eq(schema.pets.active, true)))
    .orderBy(asc(schema.pets.name));
}

export async function getPet(userId: string, petId: string) {
  const [pet] = await db
    .select()
    .from(schema.pets)
    .where(and(eq(schema.pets.id, petId), eq(schema.pets.userId, userId)))
    .limit(1);
  return pet ?? null;
}

export async function createPet(
  userId: string,
  input: Pick<NewPet, "name" | "species" | "breed" | "birthDate">,
) {
  const [pet] = await db
    .insert(schema.pets)
    .values({ ...input, userId })
    .returning();

  await logActivity({
    userId,
    domain: "pets",
    eventType: "pet.created",
    entityType: "pet",
    entityId: pet.id,
    summary: `Added pet "${pet.name}"`,
  });

  return pet;
}

export async function updatePet(
  userId: string,
  petId: string,
  input: Partial<Pick<NewPet, "name" | "species" | "breed" | "birthDate" | "active">>,
) {
  const [pet] = await db
    .update(schema.pets)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(schema.pets.id, petId), eq(schema.pets.userId, userId)))
    .returning();
  if (!pet) return null;

  await logActivity({
    userId,
    domain: "pets",
    eventType: "pet.updated",
    entityType: "pet",
    entityId: pet.id,
    summary: `Updated "${pet.name}"`,
  });

  return pet;
}

/**
 * Soft delete via the `active` flag, not a hard `db.delete()`. `pet_events.pet_id` has
 * `onDelete: cascade` — a real delete would permanently destroy the pet's entire event
 * history (medication, vet visits, everything) along with it. `active` already existed in
 * the schema for exactly this (see `listPets`'s filter) but the original implementation
 * didn't use it; fixed here rather than left as a footgun once a delete button actually
 * existed in the UI to trigger it.
 *
 * Named "retire," not "archive"/"delete" — the primary real-world reason to deactivate a pet
 * is that they've passed away, and "delete" reads as harsh/wrong for that. Retired pets stay
 * fully visible (`listAllPets`), just excluded from `listPets` (used by the AI agent and
 * Today's birthday/event surfacing — a retired pet shouldn't generate future obligations).
 */
export async function retirePet(userId: string, petId: string) {
  const [pet] = await db
    .update(schema.pets)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(schema.pets.id, petId), eq(schema.pets.userId, userId)))
    .returning();
  if (!pet) return null;

  await logActivity({
    userId,
    domain: "pets",
    eventType: "pet.retired",
    entityType: "pet",
    entityId: pet.id,
    summary: `Retired "${pet.name}"`,
  });

  return pet;
}

export async function unretirePet(userId: string, petId: string) {
  const [pet] = await db
    .update(schema.pets)
    .set({ active: true, updatedAt: new Date() })
    .where(and(eq(schema.pets.id, petId), eq(schema.pets.userId, userId)))
    .returning();
  if (!pet) return null;

  await logActivity({
    userId,
    domain: "pets",
    eventType: "pet.unretired",
    entityType: "pet",
    entityId: pet.id,
    summary: `Restored "${pet.name}"`,
  });

  return pet;
}

/**
 * All pets regardless of active status, for `/pets` — the user asked to always see
 * retired pets there too, not just active ones (unlike `listPets`, used by the AI agent and
 * Today, which stays active-only since a retired pet shouldn't generate future obligations).
 * Active pets first, then retired, alphabetical within each group.
 */
export async function listAllPets(userId: string) {
  return db
    .select()
    .from(schema.pets)
    .where(eq(schema.pets.userId, userId))
    .orderBy(desc(schema.pets.active), asc(schema.pets.name));
}

export async function listPetEvents(userId: string, petId: string) {
  return db
    .select()
    .from(schema.petEvents)
    .where(and(eq(schema.petEvents.petId, petId), eq(schema.petEvents.userId, userId)))
    .orderBy(asc(schema.petEvents.scheduledAt));
}

export async function createPetEvent(
  userId: string,
  petId: string,
  input: {
    eventType: PetEventType;
    title: string;
    scheduledAt?: Date;
    notes?: string;
    recurrenceRule?: RecurrenceConfig | null;
  },
) {
  const [event] = await db
    .insert(schema.petEvents)
    .values({ userId, petId, ...input } satisfies NewPetEvent)
    .returning();

  await logActivity({
    userId,
    domain: "pets",
    eventType: "pet_event.created",
    entityType: "pet_event",
    entityId: event.id,
    summary: `Added "${event.title}"`,
  });

  return event;
}

export async function completePetEvent(userId: string, eventId: string, timezone: string) {
  const [event] = await db
    .select()
    .from(schema.petEvents)
    .where(and(eq(schema.petEvents.id, eventId), eq(schema.petEvents.userId, userId)))
    .limit(1);
  if (!event) return null;

  const now = new Date();
  const [updated] = await db
    .update(schema.petEvents)
    .set({ completedAt: now, updatedAt: now })
    .where(eq(schema.petEvents.id, eventId))
    .returning();

  await logActivity({
    userId,
    domain: "pets",
    eventType: "pet_event.completed",
    entityType: "pet_event",
    entityId: event.id,
    summary: `Completed "${event.title}"`,
  });

  // Recurring events (e.g. monthly medication) spawn their next instance on completion,
  // the same way routines do — see lib/tasks/service.ts completeRoutine.
  if (event.recurrenceRule) {
    const config = event.recurrenceRule as RecurrenceConfig;
    const nextDate = computeNextOccurrence(config, event.scheduledAt ?? now, timezone);
    await db.insert(schema.petEvents).values({
      userId,
      petId: event.petId,
      eventType: event.eventType,
      title: event.title,
      scheduledAt: nextDate,
      notes: event.notes,
      provider: event.provider,
      recurrenceRule: event.recurrenceRule,
    });
  }

  return updated;
}

export async function deletePetEvent(userId: string, eventId: string) {
  await db.delete(schema.petEvents).where(and(eq(schema.petEvents.id, eventId), eq(schema.petEvents.userId, userId)));
}
