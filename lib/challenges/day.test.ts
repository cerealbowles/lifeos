import { describe, expect, it } from "vitest";
import { dayNumber, challengeDateRange } from "./day";

describe("dayNumber", () => {
  it("returns 1 on the start date itself", () => {
    expect(dayNumber("2026-08-01", "2026-08-01")).toBe(1);
  });

  it("counts forward inclusively", () => {
    expect(dayNumber("2026-08-01", "2026-08-23")).toBe(23);
  });

  it("handles a range spanning a month boundary", () => {
    expect(dayNumber("2026-08-25", "2026-09-05")).toBe(12);
  });
});

describe("challengeDateRange", () => {
  it("returns just the start date when today is the start date", () => {
    expect(challengeDateRange("2026-08-01", 75, "2026-08-01")).toEqual(["2026-08-01"]);
  });

  it("returns every day from start through today when the program isn't over yet", () => {
    const range = challengeDateRange("2026-08-01", 75, "2026-08-05");
    expect(range).toEqual(["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"]);
  });

  it("caps at the program's last day even if today is further out", () => {
    const range = challengeDateRange("2026-08-01", 3, "2026-08-10");
    expect(range).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
  });
});
