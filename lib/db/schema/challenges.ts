import { date, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Not a Postgres enum — same open-ended reasoning as tasks.category and
 * activity_sessions.activity_type (DATA_MODEL.md): "active"/"completed"/"abandoned" is the
 * full set today, but there's no reason a future state (e.g. "paused") should need a
 * migration to add.
 */
export const CHALLENGE_STATUSES = ["active", "completed", "abandoned"] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

/**
 * A bounded-duration, multi-habit program (the "75 Hard" shape) — distinct from routines
 * (lib/db/schema/tasks.ts), which are indefinitely recurring single tasks with no concept of
 * "day N of a program" or a defined end date. `startDate`/`durationDays` (not `endDate`) is
 * the source of truth for "day N of D" — computed fresh on every read, same reasoning as pet
 * birthdays (DECISIONS.md ADR-082): nothing to keep in sync if the start date is ever
 * corrected.
 */
export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    durationDays: integer("duration_days").notNull(),
    status: text("status", { enum: CHALLENGE_STATUSES }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("challenges_user_id_idx").on(table.userId)],
);

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;

/** The habits tracked daily within one challenge (e.g. "Read 10 pages", "No alcohol"). */
export const challengeHabits = pgTable(
  "challenge_habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("challenge_habits_challenge_id_idx").on(table.challengeId)],
);

export type ChallengeHabit = typeof challengeHabits.$inferSelect;
export type NewChallengeHabit = typeof challengeHabits.$inferInsert;

/**
 * One row per (habit, calendar day) marked done — the actual "journal" entries. `date` is a
 * plain calendar date (no time component, matching pets.birth_date's use of the same
 * Postgres `date` type), not a timestamp — a habit is either done "on" a given day or it
 * isn't, and which day it falls on is computed in the user's timezone at the application
 * boundary (lib/format.ts), same as everywhere else in the app. `challengeId` is denormalized
 * off `habitId` purely so "all completions for this challenge" doesn't need a join through
 * challenge_habits on every read (same convention as pet_events.userId being denormalized
 * off petId). `unique(habit_id, date)` makes marking a habit done twice on the same day a
 * no-op conflict rather than a duplicate row — the checkbox in the UI is a toggle, not an
 * accumulating log.
 */
export const challengeCompletions = pgTable(
  "challenge_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => challengeHabits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("challenge_completions_challenge_id_idx").on(table.challengeId),
    index("challenge_completions_habit_id_idx").on(table.habitId),
    unique("challenge_completions_habit_date_unique").on(table.habitId, table.date),
  ],
);

export type ChallengeCompletion = typeof challengeCompletions.$inferSelect;
export type NewChallengeCompletion = typeof challengeCompletions.$inferInsert;
