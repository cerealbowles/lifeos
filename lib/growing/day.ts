// Deliberately not "server-only" — pure date arithmetic, same reasoning as
// lib/pets/birthday.ts, lib/challenges/day.ts, lib/measurements/range.ts.

export const DEFAULT_CHECK_INTERVAL_DAYS = 3;

/** 1-indexed days since planting — day 1 is the planting date itself. */
export function dayCount(datePlanted: string, todayDate: string): number {
  const planted = new Date(`${datePlanted}T00:00:00Z`);
  const today = new Date(`${todayDate}T00:00:00Z`);
  const diffDays = Math.round((today.getTime() - planted.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}

/**
 * When the next check is due — the same "computed due date," not stored, pattern as
 * routines.next_due_at (except routines persist theirs; this is cheap enough to always
 * recompute, same reasoning as pet birthdays). Never checked yet (lastCheckedAt null) means
 * a check is due starting from the planting date itself, not some arbitrary future point.
 */
export function nextCheckDue(
  datePlanted: string,
  lastCheckedAt: Date | null,
  intervalDays: number = DEFAULT_CHECK_INTERVAL_DAYS,
): Date {
  const base = lastCheckedAt ?? new Date(`${datePlanted}T00:00:00Z`);
  return new Date(base.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}
