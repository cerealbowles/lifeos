import { describe, expect, it } from "vitest";
import { getDueSummary } from "./status";

describe("getDueSummary", () => {
  /**
   * DECISIONS.md ADR-098. This is the exact bug: the same instant, viewed from two different
   * timezones, used to land on different calendar days depending on which JS runtime happened
   * to be executing the code (server = UTC by default, browser = the user's real timezone) —
   * not on which timezone was actually passed in. Asserting both answers here pins the fix:
   * the result must depend only on the `timezone` argument, matching whichever list (Today
   * page vs. Tasks/Routines pane) it's called from.
   */
  it("computes the calendar-day delta relative to the given timezone, not the runtime's own", () => {
    // now: Aug 17, 02:00 UTC — already Aug 17 in UTC, but still the evening of Aug 16 in
    // America/Chicago (UTC-5 in August).
    const now = new Date("2026-08-17T02:00:00Z");
    // dueAt: Aug 17, 10:00 UTC — Aug 17 in both zones.
    const dueAt = new Date("2026-08-17T10:00:00Z");

    expect(getDueSummary(dueAt, "UTC", now).daysDelta).toBe(0); // "due today" in UTC
    expect(getDueSummary(dueAt, "America/Chicago", now).daysDelta).toBe(-1); // "due tomorrow" in Chicago
  });

  it("gives the same answer regardless of the executing machine's own timezone, given an explicit timezone", () => {
    const now = new Date("2026-08-17T12:00:00Z");
    const dueAt = new Date("2026-08-17T12:00:00Z");
    expect(getDueSummary(dueAt, "America/Chicago", now).daysDelta).toBe(0);
    expect(getDueSummary(dueAt, "Asia/Tokyo", now).daysDelta).toBe(0);
  });

  it("returns status none for a null due date", () => {
    expect(getDueSummary(null, "America/Chicago").status).toBe("none");
  });

  it("classifies overdue, due soon, and upcoming correctly within one timezone", () => {
    const now = new Date("2026-08-17T18:00:00Z"); // afternoon in America/Chicago
    const tz = "America/Chicago";

    expect(getDueSummary(new Date("2026-08-15T18:00:00Z"), tz, now).status).toBe("overdue");
    expect(getDueSummary(new Date("2026-08-17T18:00:00Z"), tz, now).status).toBe("due_soon");
    expect(getDueSummary(new Date("2026-09-01T18:00:00Z"), tz, now).status).toBe("upcoming");
  });
});
