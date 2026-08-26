import { formatInTimeZone } from "date-fns-tz";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

/**
 * Pure, same shape as lib/format.ts's `greeting()` — buckets the hour (in the user's
 * timezone) into one of four time-of-day buckets for the dashboard shell's gradient
 * background (see TIME_OF_DAY_GRADIENT below, and DECISIONS.md ADR-105).
 */
export function timeOfDay(now: Date, timezone: string): TimeOfDay {
  const hour = Number(formatInTimeZone(now, timezone, "H"));
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if (hour >= 17 && hour <= 20) return "evening";
  return "night";
}

/**
 * Deliberately desaturated — DECISIONS.md ADR-090's "restrained color" language extends to
 * this gradient too, it's meant to read as "the same quiet page, subtly warmed," not a bright
 * redesign. Each bucket fades from a faint tint down to the app's existing neutral-50/950
 * base so it doesn't compete with card content. See DECISIONS.md ADR-105/111 (landscape
 * direction: "the environment changes, the interface stays familiar"). Afternoon moved off
 * `sky-*` (a cool blue, at odds with the earth palette's "warmer earth tones, higher contrast"
 * afternoon description) to `yellow-*`, distinct from morning's amber and evening's orange;
 * night's neutral-* now resolves to the warmed stone ramp automatically (ADR-109/110), no
 * change needed here.
 */
export const TIME_OF_DAY_GRADIENT: Record<TimeOfDay, string> = {
  morning: "bg-gradient-to-b from-amber-50 to-neutral-50 dark:from-amber-950 dark:to-neutral-950",
  afternoon: "bg-gradient-to-b from-yellow-50 to-neutral-50 dark:from-yellow-950 dark:to-neutral-950",
  evening: "bg-gradient-to-b from-orange-50 to-neutral-50 dark:from-orange-950 dark:to-neutral-950",
  night: "bg-gradient-to-b from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950",
};
