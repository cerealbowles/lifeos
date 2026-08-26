import { describe, expect, it } from "vitest";
import { groupGames, toGameDTO } from "./grouping";
import type { BettingGame } from "./betting-client";

function game(overrides: Partial<BettingGame>): BettingGame {
  return {
    sport: "mlb",
    homeTeam: "NYY",
    awayTeam: "BOS",
    status: "Live",
    homeScore: 3,
    awayScore: 1,
    period: "Top 5",
    startAt: "2026-08-17T18:00:00Z",
    odds: null,
    ...overrides,
  };
}

describe("toGameDTO", () => {
  it("marks a game favorite if either the home or away team is followed", () => {
    const keys = new Set(["mlb:NYY"]);
    expect(toGameDTO(game({ homeTeam: "NYY", awayTeam: "BOS" }), keys).isFavorite).toBe(true);
    expect(toGameDTO(game({ homeTeam: "BOS", awayTeam: "NYY" }), keys).isFavorite).toBe(true);
  });

  it("is not favorite when neither team is followed", () => {
    const keys = new Set(["mlb:NYY"]);
    expect(toGameDTO(game({ homeTeam: "SF", awayTeam: "LAD" }), keys).isFavorite).toBe(false);
  });

  it("scopes favorite matching by sport — same abbreviation in a different sport doesn't match", () => {
    const keys = new Set(["nfl:SF"]); // SF 49ers followed, not SF Giants (mlb)
    expect(toGameDTO(game({ sport: "mlb", homeTeam: "SF", awayTeam: "LAD" }), keys).isFavorite).toBe(false);
  });
});

describe("groupGames", () => {
  it("groups sport-first: baseball before football, regardless of input order", () => {
    const games = [game({ sport: "nfl", homeTeam: "KC", awayTeam: "BUF" }), game({ sport: "mlb" })];
    const groups = groupGames(games, new Set());
    expect(groups.map((g) => g.sport)).toEqual(["mlb", "nfl"]);
  });

  it("elevates favorited teams' games ahead of everyone else's within a sport", () => {
    const games = [
      game({ sport: "mlb", homeTeam: "SF", awayTeam: "LAD" }),
      game({ sport: "mlb", homeTeam: "NYY", awayTeam: "BOS" }),
    ];
    const keys = new Set(["mlb:NYY"]);
    const [mlb] = groupGames(games, keys);
    expect(mlb.favorites).toHaveLength(1);
    expect(mlb.favorites[0].homeTeam).toBe("NYY");
    expect(mlb.others).toHaveLength(1);
    expect(mlb.others[0].homeTeam).toBe("SF");
  });

  it("omits a sport entirely when there are no games for it today", () => {
    const groups = groupGames([game({ sport: "mlb" })], new Set());
    expect(groups.map((g) => g.sport)).toEqual(["mlb"]);
  });

  it("returns no groups at all when there are no games", () => {
    expect(groupGames([], new Set())).toEqual([]);
  });
});
