import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { computeNextOccurrence } from "./recurrence";
import type { NewRoutine, NewTask, RecurrenceConfig, RecurrenceType, Task } from "@/lib/db/schema";

export async function listTasks(userId: string): Promise<Task[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.userId, userId), inArray(schema.tasks.status, ["todo", "in_progress"])))
    .orderBy(asc(schema.tasks.dueAt));
}

export async function createTask(
  userId: string,
  input: Pick<NewTask, "title" | "description" | "dueAt" | "priority" | "category">,
): Promise<Task> {
  const [task] = await db
    .insert(schema.tasks)
    .values({ ...input, userId })
    .returning();

  await logActivity({
    userId,
    domain: "home",
    eventType: "task.created",
    entityType: "task",
    entityId: task.id,
    summary: `Added task "${task.title}"`,
  });

  return task;
}

export async function completeTask(userId: string, taskId: string): Promise<Task | null> {
  const [task] = await db
    .update(schema.tasks)
    .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.userId, userId)))
    .returning();

  if (!task) return null;

  await logActivity({
    userId,
    domain: "home",
    eventType: "task.completed",
    entityType: "task",
    entityId: task.id,
    summary: `Completed task "${task.title}"`,
  });

  return task;
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  await db.delete(schema.tasks).where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.userId, userId)));
}

export async function deleteRoutine(userId: string, routineId: string): Promise<void> {
  await db.delete(schema.routines).where(and(eq(schema.routines.id, routineId), eq(schema.routines.userId, userId)));
}

export async function listRoutines(userId: string) {
  return db
    .select()
    .from(schema.routines)
    .where(and(eq(schema.routines.userId, userId), eq(schema.routines.active, true)))
    .orderBy(asc(schema.routines.nextDueAt));
}

export async function createRoutine(
  userId: string,
  input: {
    name: string;
    description?: string;
    category?: string;
    recurrenceType: RecurrenceType;
    recurrenceConfig: RecurrenceConfig;
    timezone: string;
  },
) {
  const nextDueAt = computeNextOccurrence(input.recurrenceConfig, new Date(), input.timezone);

  const [routine] = await db
    .insert(schema.routines)
    .values({
      userId,
      name: input.name,
      description: input.description,
      category: input.category,
      recurrenceType: input.recurrenceType,
      recurrenceConfig: input.recurrenceConfig,
      nextDueAt,
    })
    .returning();

  await logActivity({
    userId,
    domain: "home",
    eventType: "routine.created",
    entityType: "routine",
    entityId: routine.id,
    summary: `Created routine "${routine.name}"`,
  });

  return routine;
}

/**
 * `recurrenceConfig` is optional on the input, but when present it also recomputes
 * `nextDueAt` (same `computeNextOccurrence` call `createRoutine` makes) — otherwise editing a
 * routine's schedule would silently leave it due on whatever the old schedule last computed,
 * which is exactly the kind of stale-derived-field bug DECISIONS.md's denormalized-date
 * pattern (finance's `nextDueAt`/`nextStatementCloseAt`) is meant to avoid.
 */
export async function updateRoutine(
  userId: string,
  routineId: string,
  input: Partial<Pick<NewRoutine, "name" | "description" | "category">> &
    Partial<{ recurrenceType: RecurrenceType; recurrenceConfig: RecurrenceConfig }>,
  timezone: string,
) {
  const updates: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.recurrenceConfig) {
    updates.nextDueAt = computeNextOccurrence(input.recurrenceConfig, new Date(), timezone);
  }

  const [routine] = await db
    .update(schema.routines)
    .set(updates)
    .where(and(eq(schema.routines.id, routineId), eq(schema.routines.userId, userId)))
    .returning();
  if (!routine) return null;

  await logActivity({
    userId,
    domain: "home",
    eventType: "routine.updated",
    entityType: "routine",
    entityId: routine.id,
    summary: `Updated routine "${routine.name}"`,
  });

  return routine;
}

export async function completeRoutine(userId: string, routineId: string, timezone: string) {
  const [routine] = await db
    .select()
    .from(schema.routines)
    .where(and(eq(schema.routines.id, routineId), eq(schema.routines.userId, userId)))
    .limit(1);

  if (!routine) return null;

  const now = new Date();
  const nextDueAt = computeNextOccurrence(routine.recurrenceConfig, now, timezone);

  const [updated] = await db
    .update(schema.routines)
    .set({ lastCompletedAt: now, nextDueAt, updatedAt: now })
    .where(eq(schema.routines.id, routineId))
    .returning();

  await db.insert(schema.routineEvents).values({
    routineId,
    userId,
    eventType: "completed",
    scheduledFor: routine.nextDueAt ?? now,
    completedAt: now,
  });

  await logActivity({
    userId,
    domain: "home",
    eventType: "routine.completed",
    entityType: "routine",
    entityId: routineId,
    summary: `Completed "${routine.name}"`,
  });

  return updated;
}

export async function skipRoutine(userId: string, routineId: string, timezone: string) {
  const [routine] = await db
    .select()
    .from(schema.routines)
    .where(and(eq(schema.routines.id, routineId), eq(schema.routines.userId, userId)))
    .limit(1);

  if (!routine) return null;

  const now = new Date();
  const nextDueAt = computeNextOccurrence(routine.recurrenceConfig, now, timezone);

  const [updated] = await db
    .update(schema.routines)
    .set({ nextDueAt, updatedAt: now })
    .where(eq(schema.routines.id, routineId))
    .returning();

  await db.insert(schema.routineEvents).values({
    routineId,
    userId,
    eventType: "skipped",
    scheduledFor: routine.nextDueAt ?? now,
    skippedAt: now,
  });

  await logActivity({
    userId,
    domain: "home",
    eventType: "routine.skipped",
    entityType: "routine",
    entityId: routineId,
    summary: `Skipped "${routine.name}"`,
  });

  return updated;
}
