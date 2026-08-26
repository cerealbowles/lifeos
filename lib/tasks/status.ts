import { differenceInCalendarDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export type DueStatus = "overdue" | "due_soon" | "upcoming" | "none";

export type DueSummary = {
  status: DueStatus;
  /** Positive = days overdue, negative = days remaining. Undefined if there's no due date. */
  daysDelta?: number;
};

const DUE_SOON_WINDOW_DAYS = 3;

/**
 * Deterministic due-date classification shared by tasks, routines, pet events,
 * and financial reminders — kept out of the LLM per ADR-004/§27.
 *
 * DECISIONS.md ADR-098: `differenceInCalendarDays` computes "how many calendar days apart"
 * using each Date argument's LOCAL getters (year/month/date) — which reflect whatever
 * timezone the executing JS runtime reports, not the user's actual timezone. That's fine when
 * one runtime renders everything, but this function is called from two different runtimes for
 * the same data: the Today page (Next.js server, no TZ env var set → defaults to UTC) and the
 * Tasks/Routines/Pets/Money list panes (the browser, the user's real local timezone). For a
 * user west of UTC, the server's clock crosses midnight hours before the user's actual "today"
 * does — so the same `dueAt` could read as "due today" on the server-rendered Today page while
 * still correctly reading "due tomorrow" in a browser-rendered list, exactly the "Tasks pane is
 * a day behind Today" symptom this was reported as. Converting both `now` and `dueAt` through
 * `toZonedTime(_, timezone)` first (same pattern already used in lib/tasks/recurrence.ts) makes
 * the calendar-day math depend on the user's stored timezone, not on whichever machine happens
 * to be running the code.
 */
export function getDueSummary(dueAt: Date | null | undefined, timezone: string, now: Date = new Date()): DueSummary {
  if (!dueAt) return { status: "none" };

  const daysDelta = differenceInCalendarDays(toZonedTime(now, timezone), toZonedTime(dueAt, timezone));

  if (daysDelta > 0) return { status: "overdue", daysDelta };
  if (daysDelta === 0 || -daysDelta <= DUE_SOON_WINDOW_DAYS) return { status: "due_soon", daysDelta };
  return { status: "upcoming", daysDelta };
}
