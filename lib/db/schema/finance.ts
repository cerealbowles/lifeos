import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    accountType: text("account_type").notNull(),
    institution: text("institution"),
    lastFour: text("last_four"),
    // Day of the month the billing cycle closes (distinct from the payment due date,
    // which lives on financial_reminders) — useful for paying down a balance before the
    // statement generates, e.g. to improve reported utilization.
    statementCloseDay: integer("statement_close_day"),
    nextStatementCloseAt: timestamp("next_statement_close_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("financial_accounts_user_id_idx").on(table.userId)],
);

export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type NewFinancialAccount = typeof financialAccounts.$inferInsert;

/** e.g. { type: "monthly_day", day: 18 } */
export type DueRule = { type: "monthly_day"; day: number };

export const financialReminders = pgTable(
  "financial_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    financialAccountId: uuid("financial_account_id").references(() => financialAccounts.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    amount: numeric("amount"),
    dueRule: jsonb("due_rule").$type<DueRule>().notNull(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }).notNull(),
    autopay: boolean("autopay"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("financial_reminders_user_id_idx").on(table.userId),
    index("financial_reminders_next_due_at_idx").on(table.nextDueAt),
  ],
);

export type FinancialReminder = typeof financialReminders.$inferSelect;
export type NewFinancialReminder = typeof financialReminders.$inferInsert;
