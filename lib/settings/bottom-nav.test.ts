import { describe, expect, it } from "vitest";
import { validateBottomNavItems } from "./bottom-nav";

describe("validateBottomNavItems", () => {
  it("accepts a valid 4-slot array with some nulls", () => {
    expect(validateBottomNavItems(["/calendar", "/lists", null, null])).toBe(true);
  });

  it("accepts a fully populated 4-slot array", () => {
    expect(validateBottomNavItems(["/calendar", "/lists", "/ask", "/pets"])).toBe(true);
  });

  it("rejects arrays that aren't exactly 4 slots", () => {
    expect(validateBottomNavItems(["/calendar"])).toBe(false);
    expect(validateBottomNavItems(["/calendar", "/lists", "/ask", "/pets", "/money"])).toBe(false);
  });

  it("rejects all-null (no page chosen at all)", () => {
    expect(validateBottomNavItems([null, null, null, null])).toBe(false);
  });

  it("rejects duplicate hrefs across slots", () => {
    expect(validateBottomNavItems(["/calendar", "/calendar", null, null])).toBe(false);
  });

  it("rejects an href that isn't a real selectable page", () => {
    expect(validateBottomNavItems(["/not-a-real-page", null, null, null])).toBe(false);
  });

  it("rejects Settings and Today — neither is a valid pool choice", () => {
    expect(validateBottomNavItems(["/settings", null, null, null])).toBe(false);
    expect(validateBottomNavItems(["/", null, null, null])).toBe(false);
  });

  it("rejects non-array input", () => {
    expect(validateBottomNavItems(null)).toBe(false);
    expect(validateBottomNavItems("not-an-array")).toBe(false);
  });
});
