import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * DECISIONS.md ADR-096. One row per user: instance URL, encrypted API key, and which album
 * new Moments uploads get added to — same shape as weather_settings (one connected provider
 * per user, credential encrypted via lib/security/crypto.ts, never sent back to the client
 * once saved). `album_id` isn't a secret, but lives here rather than as a plain env var
 * since it's genuinely per-user configuration (which album *this* user's Log posts to), not
 * deployment config.
 */
export const immichSettings = pgTable("immich_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  instanceUrl: text("instance_url").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  albumId: text("album_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ImmichSettings = typeof immichSettings.$inferSelect;
export type NewImmichSettings = typeof immichSettings.$inferInsert;
