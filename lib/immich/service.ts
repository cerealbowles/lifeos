import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { ImmichClient } from "./client";

export type ImmichConnectionStatus = {
  connected: boolean;
  instanceUrl: string | null;
  albumId: string | null;
};

/**
 * DECISIONS.md ADR-096/097. Shared by every feature that uploads through the one per-user
 * Immich connection (Moments' lib/moments/service.ts, Grow's per-plant photos in
 * lib/growing/service.ts) — one error type so callers all surface the same message/status
 * rather than each domain inventing its own "not connected" wording.
 */
export class ImmichNotConnectedError extends Error {
  constructor() {
    super("Connect Immich in Settings before adding photos.");
  }
}

/**
 * Validates the URL/key/album by actually calling Immich, then persists all three encrypted-
 * at-rest — same "fail fast before saving anything bad" shape as lib/weather/service.ts's
 * connectWeather. The API key is never returned to the caller once saved.
 */
export async function connectImmich(userId: string, instanceUrl: string, apiKey: string, albumId: string) {
  const client = new ImmichClient(instanceUrl, apiKey);
  await client.validateCredentials();
  await client.validateAlbum(albumId);

  const apiKeyEncrypted = encryptSecret(apiKey);

  await db
    .insert(schema.immichSettings)
    .values({ userId, instanceUrl, apiKeyEncrypted, albumId })
    .onConflictDoUpdate({
      target: schema.immichSettings.userId,
      set: { instanceUrl, apiKeyEncrypted, albumId, updatedAt: new Date() },
    });
}

export async function disconnectImmich(userId: string) {
  await db.delete(schema.immichSettings).where(eq(schema.immichSettings.userId, userId));
}

export async function getImmichConnectionStatus(userId: string): Promise<ImmichConnectionStatus> {
  const [settings] = await db.select().from(schema.immichSettings).where(eq(schema.immichSettings.userId, userId));
  if (!settings) return { connected: false, instanceUrl: null, albumId: null };
  return { connected: true, instanceUrl: settings.instanceUrl, albumId: settings.albumId };
}

/** For internal use by the upload flow (app/api/moments) and the thumbnail proxy — never exposed directly. */
export async function getImmichClientForUser(
  userId: string,
): Promise<{ client: ImmichClient; albumId: string } | null> {
  const [settings] = await db.select().from(schema.immichSettings).where(eq(schema.immichSettings.userId, userId));
  if (!settings) return null;
  return {
    client: new ImmichClient(settings.instanceUrl, decryptSecret(settings.apiKeyEncrypted)),
    albumId: settings.albumId,
  };
}
