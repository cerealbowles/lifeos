import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const TASK_STATUSES = ["todo", "in_progress", "done", "skipped", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * DECISIONS.md ADR-093. `tasks.category` has always been plain text (see DATA_MODEL.md's
 * original reasoning: "the spec's conceptual schema left this open... revisit if that
 * changes") — this is that revisit. A fixed, deliberately small set now that there's a real
 * UI need (filter chips), not open-ended tag sprawl. Still just plain `text` on the column
 * (no DB-level enum) so the set can grow later without a migration; validated against this
 * array at the API boundary instead (app/api/tasks/route.ts).
 */
export const TASK_CATEGORIES = ["Home", "Car", "Yard", "Chores", "Kids"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("todo"),
    priority: text("priority", { enum: ["low", "medium", "high"] }),
    category: text("category"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // For simple one-off recurring tasks. Anything durable/complex belongs in `routines`.
    recurrenceRule: jsonb("recurrence_rule").$type<Record<string, unknown> | null>(),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tasks_user_id_idx").on(table.userId),
    index("tasks_status_idx").on(table.status),
    index("tasks_due_at_idx").on(table.dueAt),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export const RECURRENCE_TYPES = ["interval", "weekly", "monthly_day"] as const;
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

/**
 * Structured recurrence config, discriminated by `type`:
 *   { type: "interval", days: 90 }
 *   { type: "weekly", daysOfWeek: ["SAT"] }
 *   { type: "monthly_day", day: 18 }
 */
export type RecurrenceConfig =
  | { type: "interval"; days: number }
  | { type: "weekly"; daysOfWeek: string[] }
  | { type: "monthly_day"; day: number };

export const routines = pgTable(
  "routines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    recurrenceType: text("recurrence_type", { enum: RECURRENCE_TYPES }).notNull(),
    recurrenceConfig: jsonb("recurrence_config").$type<RecurrenceConfig>().notNull(),
    active: boolean("active").notNull().default(true),
    lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("routines_user_id_idx").on(table.userId),
    index("routines_next_due_at_idx").on(table.nextDueAt),
  ],
);

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;

export const ROUTINE_EVENT_TYPES = ["completed", "skipped"] as const;
export type RoutineEventType = (typeof ROUTINE_EVENT_TYPES)[number];

export const routineEvents = pgTable(
  "routine_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routineId: uuid("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type", { enum: ROUTINE_EVENT_TYPES }).notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("routine_events_routine_id_idx").on(table.routineId),
    index("routine_events_user_id_idx").on(table.userId),
  ],
);

export type RoutineEvent = typeof routineEvents.$inferSelect;
export type NewRoutineEvent = typeof routineEvents.$inferInsert;
