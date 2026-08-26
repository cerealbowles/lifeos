import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { getImmichClientForUser, ImmichNotConnectedError } from "@/lib/immich/service";
import { ImmichError } from "@/lib/immich/client";

export async function listLogEntries(userId: string, limit = 50) {
  return db
    .select()
    .from(schema.logEntries)
    .where(eq(schema.logEntries.userId, userId))
    .orderBy(desc(schema.logEntries.occurredAt))
    .limit(limit);
}

/**
 * DECISIONS.md ADR-096. Uploads the photo to the user's configured Immich album, then records
 * only the resulting asset id (never the photo bytes) in log_entries — see
 * lib/db/schema/log.ts for why. Throws ImmichNotConnectedError if Immich hasn't been
 * connected yet (Settings → Immich), and re-throws ImmichError as-is so callers can surface
 * Immich's own error message.
 */
export async function createLogEntry(
  userId: string,
  input: { file: Blob; filename: string; caption?: string; location?: string; occurredAt?: Date },
) {
  const connection = await getImmichClientForUser(userId);
  if (!connection) throw new ImmichNotConnectedError();

  const occurredAt = input.occurredAt ?? new Date();
  const upload = await connection.client.uploadAsset(input.file, input.filename, occurredAt);
  await connection.client.addToAlbum(connection.albumId, upload.assetId);

  const [entry] = await db
    .insert(schema.logEntries)
    .values({
      userId,
      immichAssetId: upload.assetId,
      caption: input.caption,
      location: input.location,
      occurredAt,
    })
    .returning();

  await logActivity({
    userId,
    domain: "moments",
    eventType: "moment.logged",
    entityType: "log_entry",
    entityId: entry.id,
    summary: entry.caption ? `Logged a moment — "${entry.caption}"` : "Logged a moment",
  });

  return entry;
}

export async function deleteLogEntry(userId: string, entryId: string) {
  await db.delete(schema.logEntries).where(and(eq(schema.logEntries.id, entryId), eq(schema.logEntries.userId, userId)));
}

/** For the thumbnail proxy route — looks up which asset to fetch from Immich for a given entry. */
export async function getLogEntryAsset(userId: string, entryId: string) {
  const [entry] = await db
    .select()
    .from(schema.logEntries)
    .where(and(eq(schema.logEntries.id, entryId), eq(schema.logEntries.userId, userId)));
  if (!entry) return null;

  const connection = await getImmichClientForUser(userId);
  if (!connection) throw new ImmichNotConnectedError();

  return { client: connection.client, assetId: entry.immichAssetId };
}

export { ImmichError };
