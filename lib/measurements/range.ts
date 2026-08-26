// Deliberately not "server-only" — pure date arithmetic, same reasoning as
// lib/pets/birthday.ts, lib/weather/ambient.ts, lib/challenges/day.ts.

export const MEASUREMENT_RANGES = ["30d", "90d", "6m", "12m", "all"] as const;
export type MeasurementRange = (typeof MEASUREMENT_RANGES)[number];

export const MEASUREMENT_RANGE_LABELS: Record<MeasurementRange, string> = {
  "30d": "30d",
  "90d": "90d",
  "6m": "6mo",
  "12m": "12mo",
  all: "All",
};

/** null means "no lower bound" (the "all" range) — callers should skip filtering entirely. */
export function rangeStartDate(range: MeasurementRange, now: Date): Date | null {
  switch (range) {
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "12m": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case "all":
      return null;
  }
}
