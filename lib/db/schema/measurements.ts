import { index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const measurements = pgTable(
  "measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    value: numeric("value").notNull(),
    unit: text("unit").notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    source: text("source").notNull().default("manual"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("measurements_user_id_idx").on(table.userId),
    index("measurements_type_idx").on(table.type),
    index("measurements_measured_at_idx").on(table.measuredAt),
  ],
);

export type Measurement = typeof measurements.$inferSelect;
export type NewMeasurement = typeof measurements.$inferInsert;
