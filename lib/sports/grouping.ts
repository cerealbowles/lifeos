import type { BettingGame } from "./betting-client";
import type { GameDTO, SportGroupDTO } from "./types";

// Pure (no "server-only", no I/O) — split out of lib/sports/service.ts specifically so the
// sport-then-favorites grouping/ordering logic can be unit-tested directly, matching this
// codebase's convention of keeping business logic testable separately from the I/O that
// feeds it (lib/growing/day.ts, lib/challenges/workout-match.ts, etc.).

const SPORT_ORDER: { key: "mlb" | "nfl"; label: string }[] = [
  { key: "mlb", label: "Baseball" },
  { key: "nfl", label: "Football" },
];

export function toGameDTO(game: BettingGame, favoriteKeys: Set<string>): GameDTO {
  return {
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    status: game.status,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    period: game.period,
    startAt: game.startAt,
    odds: game.odds,
    isFavorite: favoriteKeys.has(`${game.sport}:${game.homeTeam}`) || favoriteKeys.has(`${game.sport}:${game.awayTeam}`),
  };
}

/**
 * DECISIONS.md ADR-099 — sport-first (baseball, then football), favorited teams' games
 * elevated ahead of everyone else's within each sport. Groups with no games at all (neither
 * sport is in today's `games`) are omitted entirely, matching this app's "no empty cards"
 * convention.
 */
export function groupGames(games: BettingGame[], favoriteKeys: Set<string>): SportGroupDTO[] {
  const groups: SportGroupDTO[] = SPORT_ORDER.map(({ key, label }) => ({
    sport: key,
    label,
    favorites: [],
    others: [],
  }));

  for (const game of games) {
    const group = groups.find((g) => g.sport === game.sport);
    if (!group) continue; // Unexpected sport in the feed — ignore rather than crash the page.
    const dto = toGameDTO(game, favoriteKeys);
    (dto.isFavorite ? group.favorites : group.others).push(dto);
  }

  return groups.filter((g) => g.favorites.length + g.others.length > 0);
}
