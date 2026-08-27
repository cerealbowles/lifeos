import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fetchBoxscore, fetchGames, isConfigured, BettingApiError } from "./betting-client";
import type { Boxscore } from "./betting-client";
import { getTeam } from "./teams";
import { groupGames, toGameDTO } from "./grouping";
import type { GameDTO, SportGroupDTO } from "./types";

export { BettingApiError };

export async function listFavoriteTeams(userId: string) {
  return db
    .select()
    .from(schema.favoriteTeams)
    .where(eq(schema.favoriteTeams.userId, userId))
    .orderBy(asc(schema.favoriteTeams.teamName));
}

export class UnknownTeamError extends Error {}

export async function addFavoriteTeam(userId: string, input: { sport: string; teamAbbr: string }) {
  const team = getTeam(input.sport, input.teamAbbr);
  if (!team) throw new UnknownTeamError(`Unknown team "${input.teamAbbr}" in ${input.sport}.`);

  const [row] = await db
    .insert(schema.favoriteTeams)
    .values({ userId, sport: input.sport, teamAbbr: input.teamAbbr, teamName: team.name })
    .returning();
  return row;
}

export async function removeFavoriteTeam(userId: string, id: string) {
  await db
    .delete(schema.favoriteTeams)
    .where(and(eq(schema.favoriteTeams.id, id), eq(schema.favoriteTeams.userId, userId)));
}

export type GamesGroupedResult = { configured: boolean; groups: SportGroupDTO[] };

/**
 * DECISIONS.md ADR-099. For the /sports page — every MLB/NFL game today, not just followed
 * teams (per Geoff's explicit "I want all" — the old ESPN-based version only ever showed
 * favorite teams' games). Grouped sport-first (baseball, then football, matching Geoff's
 * explicit ask), and within each sport, favorited teams' games are elevated ahead of
 * everyone else — the UI renders a divider between `favorites` and `others` per group.
 * (Grouping/ordering itself lives in lib/sports/grouping.ts — pure, unit-tested.)
 *
 * `configured` rides along so the page can tell "not connected yet" apart from "checked,
 * genuinely nothing today" — see betting-client.ts's isConfigured() doc for why that
 * distinction matters (a real user-facing bug otherwise).
 */
export async function getGamesGrouped(userId: string): Promise<GamesGroupedResult> {
  const [favorites, games] = await Promise.all([listFavoriteTeams(userId), fetchGames()]);
  const favoriteKeys = new Set(favorites.map((f) => `${f.sport}:${f.teamAbbr}`));
  return { configured: isConfigured(), groups: groupGames(games, favoriteKeys) };
}

/**
 * For Today's ranking engine (lib/today/service.ts) — kept scoped to favorite teams only,
 * unlike the /sports page above. Today/NOW is about personal relevance (DECISIONS.md's core
 * "domains compete for attention" principle); flooding it with every league game today would
 * be exactly the "giant static dashboard" anti-pattern the product explicitly avoids. Returns
 * every favorite-team game regardless of status — the caller (today/service.ts) decides which
 * statuses/date-windows actually belong on Today, same split of responsibility the old
 * getGamesForFavorites had.
 */
export async function getFavoriteGames(userId: string): Promise<GameDTO[]> {
  const favorites = await listFavoriteTeams(userId);
  if (favorites.length === 0) return [];

  const favoriteKeys = new Set(favorites.map((f) => `${f.sport}:${f.teamAbbr}`));
  const games = await fetchGames();
  return games.map((g) => toGameDTO(g, favoriteKeys)).filter((g) => g.isFavorite);
}

/**
 * Trimmed batting/pitching lines for one MLB game — powers the "Stats & analysis" panel a
 * game card expands into (components/sports/game-card.tsx). No userId scoping needed; this
 * is public game data, not personal, same as getGamesGrouped.
 */
export async function getBoxscore(gamePk: number): Promise<Boxscore | null> {
  return fetchBoxscore(gamePk);
}
