import { boolean, date, index, integer, pgTable, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * DECISIONS.md ADR-095. Not a Postgres enum — same open-ended reasoning as
 * tasks.category/activity_sessions.activity_type. "lifting"/"run"/"walk" are the quick-log
 * presets; "golf"/anything else is still a valid free-text value, just without a dedicated
 * quick-pick button.
 */
export const WORKOUT_TYPES = ["lifting", "run", "walk", "golf"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    // Nullable — the fast 2-tap quick-log never sets this (ADR-095's "log now" assumption
    // doesn't need it), only the backfill form does, for a workout logged after the fact
    // where the actual time of day is worth recording. Never used for challenge matching
    // (lib/challenges/service.ts matches on `date` alone) — display only.
    time: time("time"),
    type: text("type").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    // Feeds Challenges' outdoor-workout auto-check (ADR-094/095) — a habit whose title
    // mentions "outdoor" is satisfied only by a workout logged with this set true.
    outdoor: boolean("outdoor").notNull().default(false),
    note: text("note"),
    // "manual" (the quick-log UI) or "webhook" (an external automation — Home Assistant,
    // an iOS Shortcut, an NFC tag) — both hit the same POST /api/workouts endpoint, this
    // just records which path a given row came from.
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("workouts_user_id_idx").on(table.userId), index("workouts_date_idx").on(table.date)],
);

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
