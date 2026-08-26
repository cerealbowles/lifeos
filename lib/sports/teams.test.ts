import { describe, expect, it } from "vitest";
import { getTeam, listTeams, SPORT_OPTIONS } from "./teams";

describe("listTeams", () => {
  it("returns 30 MLB teams and 32 NFL teams", () => {
    expect(listTeams("mlb")).toHaveLength(30);
    expect(listTeams("nfl")).toHaveLength(32);
  });

  it("returns an empty list for an unknown sport", () => {
    expect(listTeams("nhl")).toEqual([]);
  });

  it("has every abbreviation unique within a sport", () => {
    for (const { key } of SPORT_OPTIONS) {
      const abbrs = listTeams(key).map((t) => t.abbr);
      expect(new Set(abbrs).size).toBe(abbrs.length);
    }
  });
});

describe("getTeam", () => {
  it("finds a team by sport + abbreviation", () => {
    expect(getTeam("mlb", "NYY")).toEqual({ abbr: "NYY", name: "New York Yankees" });
    expect(getTeam("nfl", "KC")).toEqual({ abbr: "KC", name: "Kansas City Chiefs" });
  });

  it("distinguishes the same abbreviation across sports", () => {
    // KC is Royals in MLB, Chiefs in NFL — same letters, different team/sport.
    expect(getTeam("mlb", "KC")?.name).toBe("Kansas City Royals");
    expect(getTeam("nfl", "KC")?.name).toBe("Kansas City Chiefs");
  });

  it("returns null for an unknown team", () => {
    expect(getTeam("mlb", "ZZZ")).toBeNull();
  });
});
