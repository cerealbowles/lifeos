import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { computeNextOccurrence } from "@/lib/tasks/recurrence";
import type { DueRule, FinancialAccount, FinancialReminder } from "@/lib/db/schema";

/**
 * Bills and statement cycles roll forward on their own schedule regardless of whether the
 * user does anything — unlike tasks/routines, there's no "complete" action that advances
 * them. With no background job (see ROADMAP.md), the denormalized next_* columns can go
 * stale between visits, so every read lazily recomputes and persists when a date has
 * passed. This keeps `next_due_at`/`next_statement_close_at` correct without a cron.
 */
async function refreshAccountDates(account: FinancialAccount, timezone: string, now: Date): Promise<FinancialAccount> {
  if (!account.statementCloseDay) return account;
  if (account.nextStatementCloseAt && account.nextStatementCloseAt >= now) return account;

  const nextStatementCloseAt = computeNextOccurrence(
    { type: "monthly_day", day: account.statementCloseDay },
    now,
    timezone,
  );
  const [updated] = await db
    .update(schema.financialAccounts)
    .set({ nextStatementCloseAt, updatedAt: now })
    .where(eq(schema.financialAccounts.id, account.id))
    .returning();
  return updated;
}

async function refreshReminderDate(reminder: FinancialReminder, timezone: string, now: Date): Promise<FinancialReminder> {
  if (reminder.nextDueAt >= now) return reminder;

  const nextDueAt = computeNextOccurrence(reminder.dueRule, now, timezone);
  const [updated] = await db
    .update(schema.financialReminders)
    .set({ nextDueAt, updatedAt: now })
    .where(eq(schema.financialReminders.id, reminder.id))
    .returning();
  return updated;
}

export async function listAccounts(
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<FinancialAccount[]> {
  const accounts = await db
    .select()
    .from(schema.financialAccounts)
    .where(and(eq(schema.financialAccounts.userId, userId), eq(schema.financialAccounts.active, true)))
    .orderBy(asc(schema.financialAccounts.name));

  return Promise.all(accounts.map((a) => refreshAccountDates(a, timezone, now)));
}

export async function createAccount(
  userId: string,
  timezone: string,
  input: { name: string; accountType: string; institution?: string; lastFour?: string; statementCloseDay?: number },
  now: Date = new Date(),
): Promise<FinancialAccount> {
  const nextStatementCloseAt = input.statementCloseDay
    ? computeNextOccurrence({ type: "monthly_day", day: input.statementCloseDay }, now, timezone)
    : null;

  const [account] = await db
    .insert(schema.financialAccounts)
    .values({ userId, ...input, nextStatementCloseAt })
    .returning();

  await logActivity({
    userId,
    domain: "money",
    eventType: "financial_account.created",
    entityType: "financial_account",
    entityId: account.id,
    summary: `Added account "${account.name}"`,
  });

  return account;
}

export async function deleteAccount(userId: string, accountId: string) {
  await db
    .delete(schema.financialAccounts)
    .where(and(eq(schema.financialAccounts.id, accountId), eq(schema.financialAccounts.userId, userId)));
}

export async function listReminders(
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<FinancialReminder[]> {
  const reminders = await db
    .select()
    .from(schema.financialReminders)
    .where(eq(schema.financialReminders.userId, userId))
    .orderBy(asc(schema.financialReminders.nextDueAt));

  return Promise.all(reminders.map((r) => refreshReminderDate(r, timezone, now)));
}

export async function createReminder(
  userId: string,
  timezone: string,
  input: {
    financialAccountId?: string;
    name: string;
    amount?: string;
    dueDay: number;
    autopay?: boolean;
    notes?: string;
  },
  now: Date = new Date(),
): Promise<FinancialReminder> {
  const dueRule: DueRule = { type: "monthly_day", day: input.dueDay };
  const nextDueAt = computeNextOccurrence(dueRule, now, timezone);

  const [reminder] = await db
    .insert(schema.financialReminders)
    .values({
      userId,
      financialAccountId: input.financialAccountId,
      name: input.name,
      amount: input.amount,
      dueRule,
      nextDueAt,
      autopay: input.autopay,
      notes: input.notes,
    })
    .returning();

  await logActivity({
    userId,
    domain: "money",
    eventType: "financial_reminder.created",
    entityType: "financial_reminder",
    entityId: reminder.id,
    summary: `Added reminder "${reminder.name}"`,
  });

  return reminder;
}

/**
 * `dueDay` recomputes `nextDueAt` when present, same denormalized-date reasoning as
 * `createReminder` and routines' `updateRoutine` — otherwise changing the due day would leave
 * the reminder due on whatever date the old day last resolved to.
 */
export async function updateReminder(
  userId: string,
  reminderId: string,
  timezone: string,
  input: {
    financialAccountId?: string;
    name?: string;
    amount?: string;
    dueDay?: number;
    autopay?: boolean;
    notes?: string;
  },
  now: Date = new Date(),
): Promise<FinancialReminder | null> {
  const { dueDay, ...rest } = input;
  const updates: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (dueDay !== undefined) {
    const dueRule: DueRule = { type: "monthly_day", day: dueDay };
    updates.dueRule = dueRule;
    updates.nextDueAt = computeNextOccurrence(dueRule, now, timezone);
  }

  const [reminder] = await db
    .update(schema.financialReminders)
    .set(updates)
    .where(and(eq(schema.financialReminders.id, reminderId), eq(schema.financialReminders.userId, userId)))
    .returning();
  if (!reminder) return null;

  await logActivity({
    userId,
    domain: "money",
    eventType: "financial_reminder.updated",
    entityType: "financial_reminder",
    entityId: reminder.id,
    summary: `Updated reminder "${reminder.name}"`,
  });

  return reminder;
}

export async function deleteReminder(userId: string, reminderId: string) {
  await db
    .delete(schema.financialReminders)
    .where(and(eq(schema.financialReminders.id, reminderId), eq(schema.financialReminders.userId, userId)));
}
