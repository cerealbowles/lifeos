import { describe, expect, it } from "vitest";
import { nextBirthday } from "./birthday";

const NOW = new Date("2026-08-13T12:00:00");

describe("nextBirthday", () => {
  it("returns this year's date when the birthday hasn't happened yet this year", () => {
    const result = nextBirthday("2020-12-25", NOW);
    expect(result.date.getFullYear()).toBe(2026);
    expect(result.date.getMonth()).toBe(11); // December
    expect(result.date.getDate()).toBe(25);
    expect(result.age).toBe(6);
  });

  it("rolls over to next year when the birthday already passed this year", () => {
    const result = nextBirthday("2020-01-15", NOW);
    expect(result.date.getFullYear()).toBe(2027);
    expect(result.date.getMonth()).toBe(0); // January
    expect(result.date.getDate()).toBe(15);
    expect(result.age).toBe(7);
  });

  it("treats the birthday as upcoming (not passed) when it falls today", () => {
    const result = nextBirthday("2018-08-13", NOW);
    expect(result.date.getFullYear()).toBe(2026);
    expect(result.date.getMonth()).toBe(7); // August
    expect(result.date.getDate()).toBe(13);
    expect(result.age).toBe(8);
  });
});
