import { describe, expect, it } from "vitest";
import {
  buildDailyRundown,
  findRainTime,
  selectTone,
  teamNickname,
  type RundownInput,
} from "./rundown";
import type { GameDTO } from "@/lib/sports/types";
import type { HourlyView, WeatherView } from "@/lib/weather/service";

const TIMEZONE = "UTC";

const WEATHER: WeatherView = {
  locationName: "Home",
  temperature: 68,
  feelsLike: 68,
  conditions: "Clear",
  highToday: 92,
  lowToday: 60,
  precipitationChance: 10,
  precipitationAmount: 0,
  humidity: 40,
  windSpeed: 5,
  observedAt: "2026-08-29T09:00:00Z",
  unit: "F",
};

const HOURLY: HourlyView[] = [
  { time: "2026-08-29T09:30:00Z", temperature: 65, conditions: "Clear", precipitationChance: 5 },
  { time: "2026-08-29T10:00:00Z", temperature: 66, conditions: "Clouds", precipitationChance: 55 },
  { time: "2026-08-29T14:00:00Z", temperature: 80, conditions: "Clear", precipitationChance: 10 },
];

const CUBS_AT_DODGERS_FINAL: GameDTO = {
  sport: "mlb",
  homeTeam: "LAD",
  awayTeam: "CHC",
  status: "Final",
  homeScore: 4,
  awayScore: 6,
  period: null,
  startAt: "2026-08-29T20:00:00Z",
  odds: null,
  isFavorite: true,
  gamePk: null,
};

const ROCKIES_AT_REDS_LIVE: GameDTO = {
  sport: "mlb",
  homeTeam: "CIN",
  awayTeam: "COL",
  status: "Live",
  homeScore: 2,
  awayScore: 3,
  period: "Bot 8th, 2 outs",
  startAt: "2026-08-29T22:45:00Z",
  odds: null,
  isFavorite: true,
  gamePk: null,
};

const FAVORITE_KEYS = new Set(["mlb:CHC", "mlb:COL"]);

function baseInput(overrides: Partial<RundownInput>): RundownInput {
  return {
    now: new Date("2026-08-29T09:00:00Z"),
    timezone: TIMEZONE,
    firstName: "Geoff",
    weather: WEATHER,
    hourly: HOURLY,
    tomorrow: null,
    routinesDueToday: [],
    routinesCompletedToday: [],
    openTaskCount: 0,
    gamesToday: [],
    favoriteKeys: FAVORITE_KEYS,
    ...overrides,
  };
}

describe("selectTone", () => {
  it("uses the clock tone on a day tracking nothing (no vacuous recap)", () => {
    const input = baseInput({ now: new Date("2026-08-29T23:00:00Z"), routinesDueToday: [], gamesToday: [] });
    expect(selectTone(input)).toBe("night");
  });

  it("stays on the clock tone at night while a routine is still open", () => {
    const input = baseInput({
      now: new Date("2026-08-29T23:00:00Z"),
      routinesDueToday: [{ id: "r1", name: "Walk dog" }],
      routinesCompletedToday: [],
      gamesToday: [CUBS_AT_DODGERS_FINAL],
    });
    expect(selectTone(input)).toBe("night");
  });

  it("stays on the clock tone at night while a game is still live", () => {
    const input = baseInput({
      now: new Date("2026-08-29T23:00:00Z"),
      routinesDueToday: [{ id: "r1", name: "Walk dog" }],
      routinesCompletedToday: [{ routineId: "r1", completedAt: new Date("2026-08-29T20:00:00Z") }],
      gamesToday: [ROCKIES_AT_REDS_LIVE],
    });
    expect(selectTone(input)).toBe("night");
  });

  it("recaps once every game is Final and every due-today routine is completed", () => {
    const finalGame: GameDTO = { ...ROCKIES_AT_REDS_LIVE, status: "Final" };
    const input = baseInput({
      now: new Date("2026-08-29T23:00:00Z"),
      routinesDueToday: [{ id: "r1", name: "Walk dog" }],
      routinesCompletedToday: [{ routineId: "r1", completedAt: new Date("2026-08-29T20:00:00Z") }],
      gamesToday: [CUBS_AT_DODGERS_FINAL, finalGame],
    });
    expect(selectTone(input)).toBe("recap");
  });

  it("respects morning/afternoon clock boundaries", () => {
    expect(selectTone(baseInput({ now: new Date("2026-08-29T09:00:00Z") }))).toBe("morning");
    expect(selectTone(baseInput({ now: new Date("2026-08-29T15:00:00Z") }))).toBe("afternoon");
  });
});

describe("findRainTime", () => {
  it("returns the soonest today-only hour at/after now meeting the threshold", () => {
    const now = new Date("2026-08-29T09:00:00Z");
    expect(findRainTime(HOURLY, now, TIMEZONE)).toBe("10am");
  });

  it("returns null when nothing meets the threshold", () => {
    const now = new Date("2026-08-29T09:00:00Z");
    const lowChance = HOURLY.map((h) => ({ ...h, precipitationChance: 5 }));
    expect(findRainTime(lowChance, now, TIMEZONE)).toBeNull();
  });

  it("ignores hours before now", () => {
    const now = new Date("2026-08-29T11:00:00Z"); // after the 10am rain hour
    expect(findRainTime(HOURLY, now, TIMEZONE)).toBeNull();
  });
});

describe("teamNickname", () => {
  it("applies multi-word nickname overrides", () => {
    expect(teamNickname("mlb", "BOS")).toBe("Red Sox");
    expect(teamNickname("mlb", "CWS")).toBe("White Sox");
    expect(teamNickname("nfl", "BUF")).not.toBe(""); // sanity — resolves to something for NFL too
  });

  it("falls back to the last word of the full team name", () => {
    expect(teamNickname("mlb", "COL")).toBe("Rockies");
    expect(teamNickname("mlb", "CHC")).toBe("Cubs");
  });

  it("degrades to the raw abbreviation for an unmapped team", () => {
    expect(teamNickname("mlb", "ZZZ")).toBe("ZZZ");
  });
});

describe("buildDailyRundown", () => {
  it("produces a morning rundown whose segment text is always a substring of the sentence", () => {
    const result = buildDailyRundown(
      baseInput({
        now: new Date("2026-08-29T09:00:00Z"),
        routinesDueToday: [
          { id: "r1", name: "Walk dog" },
          { id: "r2", name: "Water plants" },
          { id: "r3", name: "Stretch" },
        ],
        openTaskCount: 1,
        gamesToday: [CUBS_AT_DODGERS_FINAL, ROCKIES_AT_REDS_LIVE],
      }),
    );
    expect(result.tone).toBe("morning");
    expect(result.sentence.startsWith("Good morning,")).toBe(true);
    for (const segment of result.segments) {
      expect(result.sentence.includes(segment.text)).toBe(true);
    }
    expect(result.sentence).toContain("three routine");
    expect(result.sentence).toContain("one open task");
  });

  it("produces an afternoon rundown matching the finished-game recap shape", () => {
    const rockiesUpcoming: GameDTO = { ...ROCKIES_AT_REDS_LIVE, status: "Preview", homeScore: null, awayScore: null };
    const result = buildDailyRundown(
      baseInput({
        now: new Date("2026-08-29T15:00:00Z"),
        routinesDueToday: [{ id: "r1", name: "Walk dog" }],
        routinesCompletedToday: [{ routineId: "r1", completedAt: new Date("2026-08-29T09:00:00Z") }],
        gamesToday: [CUBS_AT_DODGERS_FINAL, rockiesUpcoming],
      }),
    );
    expect(result.tone).toBe("afternoon");
    expect(result.sentence).toContain("Cubs beat the Dodgers earlier 6-4");
    for (const segment of result.segments) {
      expect(result.sentence.includes(segment.text)).toBe(true);
    }
  });

  it("produces a night rundown carrying the live game's period verbatim", () => {
    const result = buildDailyRundown(
      baseInput({
        now: new Date("2026-08-29T23:00:00Z"),
        firstName: "Geoff",
        routinesDueToday: [{ id: "r1", name: "Walk dog" }],
        gamesToday: [ROCKIES_AT_REDS_LIVE],
      }),
    );
    expect(result.tone).toBe("night");
    expect(result.sentence.startsWith("Good evening, Geoff.")).toBe(true);
    expect(result.sentence).toContain("Bot 8th, 2 outs");
    for (const segment of result.segments) {
      expect(result.sentence.includes(segment.text)).toBe(true);
    }
  });

  it("produces a recap rundown once the day is fully resolved", () => {
    const finalGame: GameDTO = { ...ROCKIES_AT_REDS_LIVE, status: "Final" };
    const result = buildDailyRundown(
      baseInput({
        now: new Date("2026-08-29T23:00:00Z"),
        routinesDueToday: [{ id: "r1", name: "Walk dog" }],
        routinesCompletedToday: [{ routineId: "r1", completedAt: new Date("2026-08-29T09:00:00Z") }],
        gamesToday: [CUBS_AT_DODGERS_FINAL, finalGame],
        tomorrow: { date: "2026-08-30", high: 88, low: 62, conditions: "Clear", precipitationChance: 5, precipitationAmount: 0 },
      }),
    );
    expect(result.tone).toBe("recap");
    expect(result.sentence).toContain("Cubs beat the Dodgers");
    expect(result.sentence).toContain("Rockies beat the Reds");
    expect(result.sentence).toContain("Tomorrow's weather looks like");
    for (const segment of result.segments) {
      expect(result.sentence.includes(segment.text)).toBe(true);
    }
  });
});
