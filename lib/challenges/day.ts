// Deliberately not "server-only" — pure date arithmetic, no DB/secrets, same reasoning as
// lib/pets/birthday.ts and lib/weather/ambient.ts. Unit-tested directly.

/**
 * 1-indexed day number within a challenge — day 1 is the start date itself. Both dates are
 * plain "YYYY-MM-DD" calendar-day strings (how Drizzle returns Postgres `date` columns, and
 * how lib/format.ts's formatInUserZone(..., "yyyy-MM-dd") represents "today" in the user's
 * timezone) — comparing them as UTC midnight avoids the off-by-one that parsing either string
 * in the server/browser's local timezone could introduce near a DST boundary.
 */
export function dayNumber(startDate: string, todayDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const today = new Date(`${todayDate}T00:00:00Z`);
  const diffDays = Math.round((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}

/** Every calendar day from startDate through min(today, startDate + durationDays - 1). */
export function challengeDateRange(startDate: string, durationDays: number, todayDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const today = new Date(`${todayDate}T00:00:00Z`);
  const lastPossible = new Date(start.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000);
  const end = today < lastPossible ? today : lastPossible;

  const dates: string[] = [];
  for (let d = start; d <= end; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
