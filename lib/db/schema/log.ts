import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * DECISIONS.md ADR-096 ("Moments" — the Feed/Log item from the 2026-08-14 planning doc).
 * Stores a reference to a photo, not the photo itself — `immich_asset_id` points at an asset
 * already uploaded into the user's configured Immich album (see lib/db/schema/immich.ts and
 * lib/immich/client.ts). This mirrors the doc's explicit "don't duplicate other systems' data"
 * principle: LifeOS is a thin index over Immich, not a second photo store.
 *
 * `author_id` in the doc's own spec is `user_id` here, matching every other table in this app
 * — the column already exists for exactly the doc's stated reason ("hardcode to Geoff for now,
 * but store it structurally so multi-user isn't a rewrite"), no need for a differently-named
 * column just for this one table.
 */
export const logEntries = pgTable(
  "log_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    immichAssetId: text("immich_asset_id").notNull(),
    caption: text("caption"),
    location: text("location"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("log_entries_user_id_occurred_at_idx").on(table.userId, table.occurredAt)],
);

export type LogEntry = typeof logEntries.$inferSelect;
export type NewLogEntry = typeof logEntries.$inferInsert;
