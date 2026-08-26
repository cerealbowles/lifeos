import "server-only";

import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser, hashToken } from "./session";
import type { User } from "@/lib/db/schema";

export type ApiTokenAuthResult = {
  user: User;
  via: "session" | "api_token";
  /** Set only when via === "api_token" — the user_api_tokens row id the presented bearer
   *  token hashed to. Lets a route identify "the device that made this exact request" (e.g.
   *  GET /api/auth/tokens marking which row is "this device") without the client having to
   *  have cached its own token id client-side, which breaks for any session issued before
   *  that caching existed. */
  tokenId?: string;
};

/**
 * Session cookie first (unchanged web behavior), else a per-user, per-device bearer token
 * from user_api_tokens (lib/db/schema/auth.ts) — the native mobile client's credential.
 *
 * Deliberately NOT the same helper as lib/auth/webhook.ts's requireUserOrWebhookToken: that
 * checks a single static token shared across every caller of one automation endpoint
 * (right shape for "a Home Assistant script posts here"), this checks a real per-row,
 * per-device, revocable token looked up by hash (right shape for "my phone is logged in").
 * Different security properties, kept as different functions rather than one overloaded to
 * cover both.
 */
export async function requireUserOrApiToken(request: Request): Promise<ApiTokenAuthResult | null> {
  const sessionUser = await getCurrentUser();
  if (sessionUser) return { user: sessionUser, via: "session" };

  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!providedToken) return null;

  const tokenHash = hashToken(providedToken);
  const now = new Date();
  const [row] = await db
    .select({ user: schema.users, tokenId: schema.userApiTokens.id })
    .from(schema.userApiTokens)
    .innerJoin(schema.users, eq(schema.userApiTokens.userId, schema.users.id))
    .where(
      and(
        eq(schema.userApiTokens.tokenHash, tokenHash),
        or(isNull(schema.userApiTokens.expiresAt), gt(schema.userApiTokens.expiresAt, now)),
      ),
    )
    .limit(1);
  if (!row) return null;

  // Best-effort — a dashboard stat, not something worth failing the request over.
  await db.update(schema.userApiTokens).set({ lastUsedAt: now }).where(eq(schema.userApiTokens.id, row.tokenId));

  return { user: row.user, via: "api_token", tokenId: row.tokenId };
}
