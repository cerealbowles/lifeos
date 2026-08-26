import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Not a Postgres enum, deliberately — same reasoning as tasks.category/routines.category
 * (DATA_MODEL.md): the set of trackable activities is explicitly open-ended ("health stats
 * TBD"), so a plain text column plus a small validated const array in code (see
 * lib/activities/service.ts) means adding a new activity type later never needs a migration.
 */
export const ACTIVITY_TYPES = ["stretching"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * A running or completed timed activity (e.g. a nightly stretch session started from the
 * Ambient Display). `startedAt`/`endedAt` (not a single duration value) is the source of
 * truth specifically so the ambient timer can recompute elapsed time from `startedAt` on
 * every render — a page reload mid-session doesn't lose the timer, unlike a client-only
 * `useState` counter would. `durationSeconds` is denormalized on completion purely so
 * completed-session queries (the Health page log) don't need to recompute it.
 */
export const activitySessions = pgTable(
  "activity_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityType: text("activity_type").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_sessions_user_id_idx").on(table.userId),
    index("activity_sessions_started_at_idx").on(table.startedAt),
  ],
);

export type ActivitySession = typeof activitySessions.$inferSelect;
export type NewActivitySession = typeof activitySessions.$inferInsert;
