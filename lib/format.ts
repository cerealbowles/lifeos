import { formatInTimeZone } from "date-fns-tz";

export function formatInUserZone(date: Date | string, timezone: string, pattern: string): string {
  return formatInTimeZone(date, timezone, pattern);
}

export function greeting(date: Date, timezone: string): string {
  const hour = Number(formatInTimeZone(date, timezone, "H"));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * "a" / "a and b" / "a, b, and c" — used to compress several counted things into one
 * sentence instead of a list of separate badges/lines (DECISIONS.md ADR-043/ADR-019).
 */
export function joinWithAnd(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function plural(n: number): string {
  return n === 1 ? "" : "s";
}
