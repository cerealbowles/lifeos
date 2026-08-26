import { describe, expect, it } from "vitest";
import { timeOfDay } from "./time-of-day";

function atHour(hour: number): Date {
  return new Date(Date.UTC(2026, 0, 1, hour, 0, 0));
}

describe("timeOfDay", () => {
  it("buckets 5-11 as morning", () => {
    expect(timeOfDay(atHour(5), "UTC")).toBe("morning");
    expect(timeOfDay(atHour(11), "UTC")).toBe("morning");
  });

  it("buckets 12-16 as afternoon", () => {
    expect(timeOfDay(atHour(12), "UTC")).toBe("afternoon");
    expect(timeOfDay(atHour(16), "UTC")).toBe("afternoon");
  });

  it("buckets 17-20 as evening", () => {
    expect(timeOfDay(atHour(17), "UTC")).toBe("evening");
    expect(timeOfDay(atHour(20), "UTC")).toBe("evening");
  });

  it("buckets 21-4 as night, wrapping past midnight", () => {
    expect(timeOfDay(atHour(21), "UTC")).toBe("night");
    expect(timeOfDay(atHour(23), "UTC")).toBe("night");
    expect(timeOfDay(atHour(0), "UTC")).toBe("night");
    expect(timeOfDay(atHour(4), "UTC")).toBe("night");
  });

  it("respects the given timezone, not the host clock", () => {
    // 2026-01-01T02:00:00Z is 2026-01-01T21:00:00-05:00 in America/New_York — night there,
    // even though the raw UTC hour (2) would bucket as night too by coincidence; use a case
    // where the timezone shift actually crosses a bucket boundary to prove it's used.
    const date = new Date(Date.UTC(2026, 0, 1, 16, 30)); // 16:30 UTC
    expect(timeOfDay(date, "UTC")).toBe("afternoon");
    expect(timeOfDay(date, "America/New_York")).toBe("morning"); // 11:30 EST
  });
});
