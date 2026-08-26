import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Per-user, per-device API tokens for native mobile clients (e.g. mobile/lifeos-android) —
 * distinct from both `sessions` (browser cookie, not something a native app can hold onto
 * across app restarts the same way) and the webhook tokens in lib/auth/webhook.ts (a single
 * static token shared across every caller of one automation endpoint, wrong shape for "log
 * in from your own phone" where you want one revocable credential per device).
 *
 * Same "only the hash is stored" shape as `sessions.tokenHash` (lib/auth/session.ts's
 * hashToken, reused here rather than a second hashing convention) — a leaked DB dump
 * yields no live tokens.
 */
export const userApiTokens = pgTable("user_api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  // What the user called this device at issuance ("Pixel 10a") — purely descriptive, shown
  // when deciding what to revoke.
  deviceLabel: text("device_label").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  // Nullable — unlike browser sessions (fixed 30-day TTL), a device token has no forced
  // expiry by default; revocation is explicit (DELETE /api/auth/tokens/[id]).
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserApiToken = typeof userApiTokens.$inferSelect;
export type NewUserApiToken = typeof userApiTokens.$inferInsert;
