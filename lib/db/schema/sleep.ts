import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * The strap's own 4 raw sleep states (Gen5SleepState in mobile/whoop-bridge's
 * Gen5Records.kt) — not invented sleep-science terminology (no "light"/"deep"/"REM" here;
 * the sensor doesn't report that granularity, only WAKE/STILL/SLEEP/UP). Plain text, not a
 * Postgres enum, matching activities.ACTIVITY_TYPES' reasoning — open-ended for a future
 * second source (Oura, Apple Watch) that might report different states.
 */
export const SLEEP_STAGES = ["wake", "still", "sleep", "up"] as const;
export type SleepStage = (typeof SLEEP_STAGES)[number];

/**
 * One night's (or nap's) sleep, assembled server-side from uploaded stage segments —
 * see lib/sleep/service.ts's recordSleepSegments for why session-boundary detection lives
 * here and not on the phone (a single night's segments can arrive across multiple sync
 * batches; the server is the only place that reliably sees the whole history to decide
 * continuity). Same started_at/ended_at + denormalized duration shape as activity_sessions
 * (ADR-087) — duration is always computed from the timestamps, never a second source of
 * truth for them.
 */
export const sleepSessions = pgTable(
  "sleep_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    source: text("source").notNull().default("whoop"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sleep_sessions_user_id_idx").on(table.userId),
    index("sleep_sessions_started_at_idx").on(table.startedAt),
  ],
);

export type SleepSession = typeof sleepSessions.$inferSelect;
export type NewSleepSession = typeof sleepSessions.$inferInsert;

/**
 * A contiguous run of one stage within a session — e.g. "sleep, 23:14-23:52". The phone
 * already consolidates per-second raw samples into these runs before upload (shrinks a
 * night from thousands of 1Hz samples to a few dozen segments); this table stores exactly
 * what it sends, ordered by started_at, which is what the hypnogram UI renders directly.
 */
export const sleepStageSegments = pgTable(
  "sleep_stage_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sleepSessionId: uuid("sleep_session_id")
      .notNull()
      .references(() => sleepSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stage: text("stage", { enum: SLEEP_STAGES }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sleep_stage_segments_session_id_idx").on(table.sleepSessionId),
    index("sleep_stage_segments_user_id_idx").on(table.userId),
    index("sleep_stage_segments_started_at_idx").on(table.startedAt),
  ],
);

export type SleepStageSegment = typeof sleepStageSegments.$inferSelect;
export type NewSleepStageSegment = typeof sleepStageSegments.$inferInsert;
