import { describe, expect, it } from "vitest";
import { dayCount, nextCheckDue } from "./day";

describe("dayCount", () => {
  it("returns 1 on the planting date itself", () => {
    expect(dayCount("2026-08-01", "2026-08-01")).toBe(1);
  });

  it("counts forward inclusively", () => {
    expect(dayCount("2026-06-12", "2026-08-09")).toBe(59);
  });
});

describe("nextCheckDue", () => {
  it("is due intervalDays after planting when never checked", () => {
    const result = nextCheckDue("2026-08-01", null, 3);
    expect(result.toISOString()).toBe("2026-08-04T00:00:00.000Z");
  });

  it("is due intervalDays after the last check", () => {
    const lastChecked = new Date("2026-08-10T15:00:00Z");
    const result = nextCheckDue("2026-08-01", lastChecked, 3);
    expect(result.toISOString()).toBe("2026-08-13T15:00:00.000Z");
  });

  it("defaults to a 3-day interval", () => {
    const result = nextCheckDue("2026-08-01", null);
    expect(result.toISOString()).toBe("2026-08-04T00:00:00.000Z");
  });
});
