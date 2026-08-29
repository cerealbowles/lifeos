import { formatInUserZone, greeting, plural } from "@/lib/format";
import { getTeam } from "@/lib/sports/teams";
import type { GameDTO } from "@/lib/sports/types";
import type { DailyView, HourlyView, WeatherView } from "@/lib/weather/service";

// Pure (no "server-only", no I/O) — split out from the DB-fetching orchestration in
// rundown-service.ts specifically so the narrative-generation logic is unit-testable
// directly, matching this codebase's ranking.ts/service.ts convention.

export type RundownTone = "morning" | "afternoon" | "night" | "recap";

export type RundownLink =
  | { kind: "weather" }
  | { kind: "routines" }
  | { kind: "task" }
  | { kind: "game"; gameKey: string };

/** `text` is the exact substring of `sentence` this segment covers — Android locates each via a
 *  left-to-right String.indexOf pass, not a char-offset range (robust against any hand-parsed
 *  JSON encoding-length mismatch). */
export type RundownSegment = { text: string; link: RundownLink };

export type DailyRundown = {
  tone: RundownTone;
  /** Short home-card line — the "Good morning, ..." examples. */
  sentence: string;
  /** Ordered, non-overlapping tappable spans within `sentence`. */
  segments: RundownSegment[];
  /** Full "More" narrative — plain prose, no embedded tap targets. */
  detail: string;
  generatedAt: string;
};

export type RundownInput = {
  now: Date;
  timezone: string;
  firstName: string | null;
  weather: WeatherView | null;
  hourly: HourlyView[];
  /** Tomorrow's daily forecast (daily[1] from getWeatherOverview), for the Recap tone. */
  tomorrow: DailyView | null;
  routinesDueToday: Array<{ id: string; name: string }>;
  routinesCompletedToday: Array<{ routineId: string; completedAt: Date }>;
  openTaskCount: number;
  gamesToday: GameDTO[];
  /** `${sport}:${teamAbbr}` keys, to resolve which side of a game is "us." */
  favoriteKeys: Set<string>;
};

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function numberWord(n: number): string {
  return n >= 0 && n <= 10 ? NUMBER_WORDS[n] : String(n);
}

const TEAM_NICKNAME_OVERRIDES: Record<string, string> = {
  "Boston Red Sox": "Red Sox",
  "Chicago White Sox": "White Sox",
  "Toronto Blue Jays": "Blue Jays",
};

export function teamNickname(sport: string, abbr: string): string {
  const fullName = getTeam(sport, abbr)?.name ?? abbr;
  return TEAM_NICKNAME_OVERRIDES[fullName] ?? fullName.split(" ").slice(-1)[0];
}

/** Home vs away resolution for "which side is the user's favorite team." Defaults to home in
 *  the rare case both teams happen to be favorited. */
export function favoriteSide(game: GameDTO, favoriteKeys: Set<string>): "home" | "away" {
  return favoriteKeys.has(`${game.sport}:${game.homeTeam}`) ? "home" : "away";
}

export function gameKey(g: GameDTO): string {
  return `${g.sport}-${g.awayTeam}-${g.homeTeam}-${g.startAt}`;
}

/** "4:00pm" -> "4pm" — casual spoken-style time, matching the spec's "at 4" / "at 6:45pm". */
export function formatCasualTime(date: Date, timezone: string): string {
  const raw = formatInUserZone(date, timezone, "h:mma").toLowerCase();
  return raw.replace(/:00([ap]m)$/i, "$1");
}

/** Soonest today-only hour at/after `now` with precipitationChance >= threshold, or null. A
 *  looser threshold (40%) than WeatherSummary's own "rain likely" warning (50%/0.25in) —
 *  this is a passing mention in a sentence, not a warning banner. */
export function findRainTime(hourly: HourlyView[], now: Date, timezone: string, thresholdPct = 40): string | null {
  const todayStr = formatInUserZone(now, timezone, "yyyy-MM-dd");
  const candidate = hourly.find((h) => {
    const hourDate = new Date(h.time);
    return (
      formatInUserZone(hourDate, timezone, "yyyy-MM-dd") === todayStr &&
      hourDate.getTime() >= now.getTime() &&
      h.precipitationChance >= thresholdPct
    );
  });
  return candidate ? formatCasualTime(new Date(candidate.time), timezone) : null;
}

function clockTone(now: Date, timezone: string): "morning" | "afternoon" | "night" {
  const g = greeting(now, timezone);
  if (g === "Good morning") return "morning";
  if (g === "Good afternoon") return "afternoon";
  return "night";
}

function completedTodayCount(input: RundownInput): number {
  const dueIds = new Set(input.routinesDueToday.map((r) => r.id));
  const completedIds = new Set(
    input.routinesCompletedToday.filter((c) => dueIds.has(c.routineId)).map((c) => c.routineId),
  );
  return completedIds.size;
}

function completedBeforeHour(input: RundownInput, hourCutoff: number): number {
  const dueIds = new Set(input.routinesDueToday.map((r) => r.id));
  const completedIds = new Set(
    input.routinesCompletedToday
      .filter((c) => dueIds.has(c.routineId) && Number(formatInUserZone(c.completedAt, input.timezone, "H")) < hourCutoff)
      .map((c) => c.routineId),
  );
  return completedIds.size;
}

/** State-based, not clock-based: Recap only once every game today is Final AND every due-today
 *  routine is completed. A day tracking nothing (no games, no routines due) can't vacuously
 *  "recap" — it stays on the normal clock tone. */
export function selectTone(input: RundownInput): RundownTone {
  const tone = clockTone(input.now, input.timezone);
  const trackedCount = input.gamesToday.length + input.routinesDueToday.length;
  if (trackedCount === 0) return tone;

  const gamesAllFinal = input.gamesToday.every((g) => g.status === "Final");
  const routinesAllDone = completedTodayCount(input) >= input.routinesDueToday.length;
  if (gamesAllFinal && routinesAllDone) return "recap";
  return tone;
}

class RundownBuilder {
  private parts: string[] = [];
  private segments: RundownSegment[] = [];

  text(s: string): this {
    this.parts.push(s);
    return this;
  }

  link(s: string, link: RundownLink): this {
    this.parts.push(s);
    this.segments.push({ text: s, link });
    return this;
  }

  build(): { sentence: string; segments: RundownSegment[] } {
    return { sentence: this.parts.join(""), segments: this.segments };
  }
}

function gameStartText(g: GameDTO, timezone: string): string {
  return g.startAt ? formatCasualTime(new Date(g.startAt), timezone) : "later today";
}

function buildMorningRundown(input: RundownInput): { sentence: string; segments: RundownSegment[] } {
  const b = new RundownBuilder();
  b.text("Good morning, ");

  if (input.weather) {
    const rainTime = findRainTime(input.hourly, input.now, input.timezone);
    const weatherText = rainTime
      ? `the weather is currently ${input.weather.temperature} degrees, a chance of rain at ${rainTime}, and a high of ${input.weather.highToday} today`
      : `the weather is currently ${input.weather.temperature} degrees, with a high of ${input.weather.highToday} today`;
    b.link(weatherText, { kind: "weather" });
  } else {
    b.text("here's your day");
  }
  b.text(". ");

  const routineCount = input.routinesDueToday.length;
  const taskCount = input.openTaskCount;
  if (routineCount > 0 || taskCount > 0) {
    b.text("You have ");
    if (routineCount > 0) b.link(`${numberWord(routineCount)} routine${plural(routineCount)} for today`, { kind: "routines" });
    if (routineCount > 0 && taskCount > 0) b.text(" and ");
    if (taskCount > 0) b.link(`${numberWord(taskCount)} open task${plural(taskCount)}`, { kind: "task" });
    b.text(". ");
  }

  input.gamesToday.forEach((g, i) => {
    const away = teamNickname(g.sport, g.awayTeam);
    const home = teamNickname(g.sport, g.homeTeam);
    const time = gameStartText(g, input.timezone);
    const lead = i === 0 ? "The" : "the";
    const text = `${lead} ${away} play the ${home} today at ${time}`;
    if (i > 0) b.text(", ");
    b.link(text, { kind: "game", gameKey: gameKey(g) });
  });
  if (input.gamesToday.length > 0) b.text(".");

  return b.build();
}

function buildAfternoonRundown(input: RundownInput): { sentence: string; segments: RundownSegment[] } {
  const b = new RundownBuilder();
  b.text("Good afternoon. ");

  const finished = input.gamesToday.filter((g) => g.status === "Final");
  finished.forEach((g) => {
    const side = favoriteSide(g, input.favoriteKeys);
    const favScore = side === "home" ? g.homeScore : g.awayScore;
    const oppScore = side === "home" ? g.awayScore : g.homeScore;
    const favName = teamNickname(g.sport, side === "home" ? g.homeTeam : g.awayTeam);
    const oppName = teamNickname(g.sport, side === "home" ? g.awayTeam : g.homeTeam);
    const won = favScore !== null && oppScore !== null && favScore > oppScore;
    const verb = won ? "beat" : "lost to";
    const scoreText = favScore !== null && oppScore !== null ? ` earlier ${favScore}-${oppScore}` : " earlier";
    b.link(`The ${favName} ${verb} the ${oppName}${scoreText}`, { kind: "game", gameKey: gameKey(g) });
    b.text(". ");
  });

  const completedThisMorning = completedBeforeHour(input, 12);
  if (completedThisMorning > 0) {
    b.link(`You completed ${numberWord(completedThisMorning)} routine${plural(completedThisMorning)} this morning`, {
      kind: "routines",
    });
    b.text(". ");
  }

  const notFinished = input.gamesToday.filter((g) => g.status !== "Final");
  notFinished.forEach((g) => {
    const side = favoriteSide(g, input.favoriteKeys);
    const favName = teamNickname(g.sport, side === "home" ? g.homeTeam : g.awayTeam);
    let text: string;
    if (g.status === "Live") {
      text = `${favName} live now`;
    } else {
      const minutes = g.startAt ? Math.max(0, Math.round((new Date(g.startAt).getTime() - input.now.getTime()) / 60000)) : null;
      text = minutes !== null ? `${favName} upcoming in ${numberWord(minutes)} minutes` : `${favName} upcoming later today`;
    }
    b.link(text, { kind: "game", gameKey: gameKey(g) });
    b.text(" and ");
  });

  const remaining = input.routinesDueToday.length - completedTodayCount(input);
  if (remaining > 0) {
    b.link(`${numberWord(remaining)} more routine${plural(remaining)} today`, { kind: "routines" });
    b.text(". ");
  }

  b.text("Enjoy the rest of the afternoon!");
  return trimDangling(b.build());
}

function buildNightRundown(input: RundownInput): { sentence: string; segments: RundownSegment[] } {
  const b = new RundownBuilder();
  b.text(input.firstName ? `Good evening, ${input.firstName}. ` : "Good evening. ");

  const live = input.gamesToday.filter((g) => g.status === "Live");
  live.forEach((g) => {
    const side = favoriteSide(g, input.favoriteKeys);
    const favScore = side === "home" ? g.homeScore : g.awayScore;
    const oppScore = side === "home" ? g.awayScore : g.homeScore;
    const favName = teamNickname(g.sport, side === "home" ? g.homeTeam : g.awayTeam);
    const oppName = teamNickname(g.sport, side === "home" ? g.awayTeam : g.homeTeam);
    const leading = favScore !== null && oppScore !== null && favScore > oppScore;
    const verb = leading ? "beating" : "trailing";
    const scoreText = favScore !== null && oppScore !== null ? `, ${favScore}-${oppScore}` : "";
    const periodText = g.period ? ` ${g.period}` : "";
    b.link(`The ${favName} are currently ${verb} the ${oppName}${scoreText}${periodText}`, {
      kind: "game",
      gameKey: gameKey(g),
    });
    b.text(". ");
  });

  const upcoming = input.gamesToday.filter((g) => g.status === "Preview");
  upcoming.forEach((g) => {
    const side = favoriteSide(g, input.favoriteKeys);
    const favName = teamNickname(g.sport, side === "home" ? g.homeTeam : g.awayTeam);
    const time = gameStartText(g, input.timezone);
    b.link(`${favName} at ${time}`, { kind: "game", gameKey: gameKey(g) });
    b.text(". ");
  });

  const remaining = input.routinesDueToday.length - completedTodayCount(input);
  if (remaining > 0) {
    b.link(`${numberWord(remaining)} more routine${plural(remaining)} tonight`, { kind: "routines" });
    b.text(" for a good day. ");
  }

  b.text("Check back in tonight for a recap!");
  return b.build();
}

function buildRecapRundown(input: RundownInput): { sentence: string; segments: RundownSegment[] } {
  const b = new RundownBuilder();

  const finished = input.gamesToday.filter((g) => g.status === "Final");
  finished.forEach((g, i) => {
    if (i > 0) b.text(i === finished.length - 1 ? ", and " : ", ");
    const side = favoriteSide(g, input.favoriteKeys);
    const favScore = side === "home" ? g.homeScore : g.awayScore;
    const oppScore = side === "home" ? g.awayScore : g.homeScore;
    const favName = teamNickname(g.sport, side === "home" ? g.homeTeam : g.awayTeam);
    const oppName = teamNickname(g.sport, side === "home" ? g.awayTeam : g.homeTeam);
    const won = favScore !== null && oppScore !== null && favScore > oppScore;
    b.link(won ? `${favName} beat the ${oppName}` : `${favName} lost to the ${oppName}`, {
      kind: "game",
      gameKey: gameKey(g),
    });
  });
  if (finished.length > 0) b.text(". ");

  const totalRoutines = input.routinesDueToday.length;
  const completed = completedTodayCount(input);
  const taskCount = input.openTaskCount;
  const taskText =
    taskCount > 0
      ? `there ${taskCount === 1 ? "is" : "are"} still ${numberWord(taskCount)} open task${plural(taskCount)}`
      : "there are no open tasks";

  if (totalRoutines > 0) {
    const routinesText =
      completed >= totalRoutines
        ? `You completed your ${numberWord(totalRoutines)} routine${plural(totalRoutines)} today`
        : `You completed ${numberWord(completed)} of your ${numberWord(totalRoutines)} routines today`;
    b.link(routinesText, { kind: "routines" });
    b.text(" and ");
    b.link(taskText, { kind: "task" });
  } else {
    b.link(taskText.charAt(0).toUpperCase() + taskText.slice(1), { kind: "task" });
  }
  b.text(". ");

  if (input.tomorrow) {
    b.text(
      `Tomorrow's weather looks like ${input.tomorrow.conditions.toLowerCase()}, with a high of ${input.tomorrow.high} and a low of ${input.tomorrow.low}.`,
    );
  }

  return trimDangling(b.build());
}

/** Strips a trailing ", " / " and " left over when the last item in a loop-built list turns
 *  out to be the final content of the sentence. */
function trimDangling(result: { sentence: string; segments: RundownSegment[] }): { sentence: string; segments: RundownSegment[] } {
  return { ...result, sentence: result.sentence.replace(/ and $/, " ") };
}

function detailGameSentence(g: GameDTO, input: RundownInput): string {
  const side = favoriteSide(g, input.favoriteKeys);
  const favName = teamNickname(g.sport, side === "home" ? g.homeTeam : g.awayTeam);
  const oppName = teamNickname(g.sport, side === "home" ? g.awayTeam : g.homeTeam);
  const favScore = side === "home" ? g.homeScore : g.awayScore;
  const oppScore = side === "home" ? g.awayScore : g.homeScore;

  if (g.status === "Final" && favScore !== null && oppScore !== null) {
    return favScore > oppScore
      ? `The ${favName} beat the ${oppName} ${favScore}-${oppScore}.`
      : `The ${favName} lost to the ${oppName} ${favScore}-${oppScore}.`;
  }
  if (g.status === "Live" && favScore !== null && oppScore !== null) {
    const periodClause = g.period ? ` (${g.period})` : "";
    return `The ${favName} are playing the ${oppName} now, ${favScore}-${oppScore}${periodClause}.`;
  }
  return `The ${favName} play the ${oppName} at ${gameStartText(g, input.timezone)}.`;
}

function buildDetailNarrative(input: RundownInput): string {
  const sentences: string[] = [];

  if (input.weather) {
    const rainTime = findRainTime(input.hourly, input.now, input.timezone);
    sentences.push(
      rainTime
        ? `It's currently ${input.weather.temperature} degrees with ${input.weather.conditions.toLowerCase()}, a chance of rain around ${rainTime}, and a high of ${input.weather.highToday} today.`
        : `It's currently ${input.weather.temperature} degrees with ${input.weather.conditions.toLowerCase()} and a high of ${input.weather.highToday} today.`,
    );
  }

  if (input.gamesToday.length > 0) {
    sentences.push(input.gamesToday.map((g) => detailGameSentence(g, input)).join(" "));
  }

  const totalRoutines = input.routinesDueToday.length;
  if (totalRoutines > 0) {
    const completed = completedTodayCount(input);
    sentences.push(
      completed >= totalRoutines
        ? `You completed all ${numberWord(totalRoutines)} routine${plural(totalRoutines)} today.`
        : `You've completed ${numberWord(completed)} of ${numberWord(totalRoutines)} routines today.`,
    );
  }

  sentences.push(
    input.openTaskCount > 0
      ? `You have ${numberWord(input.openTaskCount)} open task${plural(input.openTaskCount)}.`
      : "You have no open tasks.",
  );

  if (input.tomorrow) {
    sentences.push(
      `Tomorrow looks like ${input.tomorrow.conditions.toLowerCase()}, with a high of ${input.tomorrow.high} and a low of ${input.tomorrow.low}.`,
    );
  }

  return sentences.join(" ");
}

export function buildDailyRundown(input: RundownInput): DailyRundown {
  const tone = selectTone(input);
  const { sentence, segments } =
    tone === "morning"
      ? buildMorningRundown(input)
      : tone === "afternoon"
        ? buildAfternoonRundown(input)
        : tone === "night"
          ? buildNightRundown(input)
          : buildRecapRundown(input);

  return {
    tone,
    sentence,
    segments,
    detail: buildDetailNarrative(input),
    generatedAt: input.now.toISOString(),
  };
}
