import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

export async function listNotes(userId: string) {
  return db
    .select()
    .from(schema.notes)
    .where(and(eq(schema.notes.userId, userId), eq(schema.notes.archived, false)))
    .orderBy(desc(schema.notes.pinned), desc(schema.notes.updatedAt));
}

export async function getNote(userId: string, noteId: string) {
  const [note] = await db
    .select()
    .from(schema.notes)
    .where(and(eq(schema.notes.id, noteId), eq(schema.notes.userId, userId)))
    .limit(1);

  return note ?? null;
}

export async function createNote(userId: string, input: { title?: string; body?: string } = {}) {
  const [note] = await db
    .insert(schema.notes)
    .values({ userId, title: input.title ?? "", body: input.body ?? "" })
    .returning();

  await logActivity({
    userId,
    domain: "notes",
    eventType: "note.created",
    entityType: "note",
    entityId: note.id,
    summary: note.title ? `Created note "${note.title}"` : "Created a new note",
  });

  return note;
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: { title?: string; body?: string; pinned?: boolean },
) {
  const [note] = await db
    .update(schema.notes)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(schema.notes.id, noteId), eq(schema.notes.userId, userId)))
    .returning();

  return note ?? null;
}

/**
 * Soft delete via `archived`, same reasoning as lists/pets (lib/lists/service.ts
 * archiveList) — keeps note history recoverable rather than a hard db.delete().
 */
export async function archiveNote(userId: string, noteId: string) {
  const [note] = await db
    .update(schema.notes)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(schema.notes.id, noteId), eq(schema.notes.userId, userId)))
    .returning();
  if (!note) return null;

  await logActivity({
    userId,
    domain: "notes",
    eventType: "note.archived",
    entityType: "note",
    entityId: note.id,
    summary: note.title ? `Removed note "${note.title}"` : "Removed a note",
  });

  return note;
}
