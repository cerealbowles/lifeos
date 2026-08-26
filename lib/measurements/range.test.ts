import { describe, expect, it } from "vitest";
import { rangeStartDate } from "./range";

const NOW = new Date("2026-08-13T12:00:00Z");

describe("rangeStartDate", () => {
  it("30d goes back 30 days", () => {
    expect(rangeStartDate("30d", NOW)?.toISOString()).toBe("2026-07-14T12:00:00.000Z");
  });

  it("90d goes back 90 days", () => {
    expect(rangeStartDate("90d", NOW)?.toISOString()).toBe("2026-05-15T12:00:00.000Z");
  });

  it("6m goes back 6 calendar months", () => {
    // setMonth/setFullYear mutate in local time, not UTC, so assert against local getters —
    // matches what the implementation actually does regardless of the test runner's TZ.
    const result = rangeStartDate("6m", NOW)!;
    expect(result.getMonth()).toBe(NOW.getMonth() - 6);
    expect(result.getFullYear()).toBe(NOW.getFullYear());
  });

  it("12m goes back 1 calendar year", () => {
    const result = rangeStartDate("12m", NOW)!;
    expect(result.getFullYear()).toBe(NOW.getFullYear() - 1);
    expect(result.getMonth()).toBe(NOW.getMonth());
  });

  it("all has no lower bound", () => {
    expect(rangeStartDate("all", NOW)).toBeNull();
  });
});
