import "server-only";

export class BettingApiError extends Error {}

export type BettingGameStatus = "Preview" | "Live" | "Final";
export type BettingSport = "mlb" | "nfl";

export type BettingGameOdds = {
  homeMoneyline: number | null;
  awayMoneyline: number | null;
  totalLine: number | null;
  overOdds: number | null;
  underOdds: number | null;
};

export type BettingGame = {
  sport: BettingSport;
  homeTeam: string; // abbreviation, e.g. "NYY"
  awayTeam: string;
  status: BettingGameStatus;
  homeScore: number | null;
  awayScore: number | null;
  /** Human-readable live state, e.g. "Top 7 · 1out" (MLB) or ESPN's detail string (NFL). Null pre-game. */
  period: string | null;
  /** ISO timestamp, or null if the source couldn't resolve a start time for this game. */
  startAt: string | null;
  odds: BettingGameOdds | null;
  /** MLB Stats API gamePk — only present for sport "mlb", needed to fetch a boxscore. */
  gamePk: number | null;
};

export type BoxscoreBatter = {
  name: string;
  pos: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
};

export type BoxscorePitcher = {
  name: string;
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  pitches: number;
};

export type BoxscoreSide = {
  abbr: string;
  batters: BoxscoreBatter[];
  pitchers: BoxscorePitcher[];
};

export type Boxscore = {
  away: BoxscoreSide;
  home: BoxscoreSide;
};

/**
 * DECISIONS.md ADR-099. Thin client for the sports-betting app's GET /api/lifeos/games
 * (/home/spooky/sports-betting, a separate self-hosted app) — LifeOS's Sports domain has no
 * database of its own for games anymore; sports-betting already tracks live score/odds state
 * with its own short-TTL cache, so this just reads that on every request rather than
 * duplicating a sync/cache layer LifeOS would have to keep in step with a second source.
 *
 * Configured via env vars (SPORTS_BETTING_URL/SPORTS_BETTING_TOKEN), not a per-user Settings
 * form — this is deployment-level config connecting two of the user's own self-hosted apps on
 * the same machine, the same category as DATABASE_URL/AI_BASE_URL, not a personal third-party
 * API key. Returns an empty list (not an error) if unconfigured — a fresh install shouldn't
 * show a broken Sports page just because this integration hasn't been set up yet.
 *
 * `isConfigured()` exists specifically so the UI can tell "not connected" apart from "checked,
 * genuinely no games" — both used to render as the same "No MLB or NFL games today" message,
 * which reads as a factual claim about today's schedule when it might just mean the two apps
 * were never wired up. Caught from a real report: "says Colorado Rockies — no games today,
 * which is false" (SPORTS_BETTING_URL/TOKEN weren't set at all, so this was silently returning
 * an empty list from `fetchGames` rather than actually checking).
 */
export function isConfigured(): boolean {
  return Boolean(process.env.SPORTS_BETTING_URL && process.env.SPORTS_BETTING_TOKEN);
}

export async function fetchGames(sports: BettingSport[] = ["mlb", "nfl"]): Promise<BettingGame[]> {
  const baseUrl = process.env.SPORTS_BETTING_URL;
  const token = process.env.SPORTS_BETTING_TOKEN;
  if (!baseUrl || !token) return [];

  const url = new URL("/api/lifeos/games", baseUrl);
  url.searchParams.set("sport", sports.join(","));

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-LifeOS-Token": token },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new BettingApiError(err instanceof Error ? err.message : "Could not reach sports-betting.");
  }
  if (res.status === 401) throw new BettingApiError("sports-betting rejected the token — check SPORTS_BETTING_TOKEN.");
  if (!res.ok) throw new BettingApiError(`sports-betting returned ${res.status}`);

  const data = (await res.json()) as { games: BettingGame[] };
  return data.games ?? [];
}

/**
 * Trimmed current-game batting/pitching lines for one MLB game, from sports-betting's
 * GET /api/lifeos/mlb/game/<gamePk>/boxscore — same gate as fetchGames(). Called on demand
 * when a game card is expanded (components/sports/game-card.tsx), not on every games-list
 * load, since most games on the page won't get expanded.
 */
export async function fetchBoxscore(gamePk: number): Promise<Boxscore | null> {
  const baseUrl = process.env.SPORTS_BETTING_URL;
  const token = process.env.SPORTS_BETTING_TOKEN;
  if (!baseUrl || !token) return null;

  const url = new URL(`/api/lifeos/mlb/game/${gamePk}/boxscore`, baseUrl);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-LifeOS-Token": token },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new BettingApiError(err instanceof Error ? err.message : "Could not reach sports-betting.");
  }
  if (res.status === 404) return null;
  if (res.status === 401) throw new BettingApiError("sports-betting rejected the token — check SPORTS_BETTING_TOKEN.");
  if (!res.ok) throw new BettingApiError(`sports-betting returned ${res.status}`);

  return (await res.json()) as Boxscore;
}
