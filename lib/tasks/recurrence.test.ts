import { describe, expect, it } from "vitest";
import { computeNextOccurrence } from "./recurrence";

const TZ = "America/Chicago";

describe("computeNextOccurrence", () => {
  it("interval: adds N days", () => {
    const from = new Date("2026-07-07T15:00:00Z"); // filter changed
    const next = computeNextOccurrence({ type: "interval", days: 90 }, from, TZ);
    expect(next.toISOString().slice(0, 10)).toBe("2026-10-05");
  });

  it("weekly: finds the next matching day of week, not today even if today matches", () => {
    // 2026-08-15 is a Saturday in America/Chicago
    const from = new Date("2026-08-15T12:00:00-05:00");
    const next = computeNextOccurrence({ type: "weekly", daysOfWeek: ["SAT"] }, from, TZ);
    expect(next.toISOString().slice(0, 10)).toBe("2026-08-22");
  });

  it("weekly: picks the nearest of multiple days", () => {
    // Tuesday 2026-08-11
    const from = new Date("2026-08-11T12:00:00-05:00");
    const next = computeNextOccurrence({ type: "weekly", daysOfWeek: ["SUN", "WED"] }, from, TZ);
    expect(next.toISOString().slice(0, 10)).toBe("2026-08-12"); // Wednesday
  });

  it("monthly_day: rolls to next month when the day has already passed", () => {
    const from = new Date("2026-08-20T12:00:00-05:00");
    const next = computeNextOccurrence({ type: "monthly_day", day: 18 }, from, TZ);
    expect(next.toISOString().slice(0, 10)).toBe("2026-09-18");
  });

  it("monthly_day: stays in the current month when the day hasn't passed yet", () => {
    const from = new Date("2026-08-01T12:00:00-05:00");
    const next = computeNextOccurrence({ type: "monthly_day", day: 18 }, from, TZ);
    expect(next.toISOString().slice(0, 10)).toBe("2026-08-18");
  });

  it("monthly_day: clamps to the last day of shorter months", () => {
    // Already past the 31st in January, so this rolls into February, which has 28 days in 2027.
    const from = new Date("2027-01-31T18:00:00-06:00");
    const next = computeNextOccurrence({ type: "monthly_day", day: 31 }, from, TZ);
    expect(next.toISOString().slice(0, 10)).toBe("2027-02-28");
  });
});
