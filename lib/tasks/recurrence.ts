import { addDays, addMonths, getDate, lastDayOfMonth, setDate, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { RecurrenceConfig } from "@/lib/db/schema";

const DAY_INDEX: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

function clampToMonth(base: Date, day: number): Date {
  const lastDay = getDate(lastDayOfMonth(base));
  return setDate(base, Math.min(day, lastDay));
}

/**
 * Computes the next occurrence after `from`, given a structured recurrence config.
 * All day-boundary math happens in the user's local timezone, then converts back to UTC,
 * so "every 90 days" and "on the 18th" land on the calendar day the user actually means.
 */
export function computeNextOccurrence(config: RecurrenceConfig, from: Date, timezone: string): Date {
  switch (config.type) {
    case "interval": {
      if (config.days <= 0) throw new Error("interval recurrence requires days > 0");
      const zonedFrom = toZonedTime(from, timezone);
      return fromZonedTime(addDays(zonedFrom, config.days), timezone);
    }

    case "weekly": {
      const targetIndices = config.daysOfWeek
        .map((d) => DAY_INDEX[d.toUpperCase()])
        .filter((n): n is number => n !== undefined)
        .sort((a, b) => a - b);
      if (targetIndices.length === 0) {
        throw new Error("weekly recurrence requires at least one valid day of week");
      }

      const zonedFrom = toZonedTime(from, timezone);
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = addDays(zonedFrom, offset);
        if (targetIndices.includes(candidate.getDay())) {
          return fromZonedTime(startOfDay(candidate), timezone);
        }
      }
      throw new Error("unreachable: no matching day of week found within 7 days");
    }

    case "monthly_day": {
      if (config.day < 1 || config.day > 31) throw new Error("monthly_day requires day between 1 and 31");
      const zonedFrom = toZonedTime(from, timezone);
      let candidate = clampToMonth(zonedFrom, config.day);
      if (candidate <= zonedFrom) {
        candidate = clampToMonth(addMonths(zonedFrom, 1), config.day);
      }
      return fromZonedTime(startOfDay(candidate), timezone);
    }
  }
}
