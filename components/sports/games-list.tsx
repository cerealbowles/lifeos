"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { GameCard } from "./game-card";
import type { SportGroupDTO } from "@/lib/sports/types";

type GamesResponse = { configured: boolean; groups: SportGroupDTO[] };

/**
 * DECISIONS.md ADR-099. Sport-first grouping (baseball, then football — the order
 * lib/sports/service.ts's getGamesGrouped already returns), and within each sport, favorited
 * teams' games render first with a divider line before everyone else's games — per Geoff's
 * explicit "all games, but elevate my teams to the top with a line between."
 *
 * `configured` distinguishes "sports-betting isn't connected yet" from "checked, genuinely no
 * games today" — caught from a real report ("says Colorado Rockies — no games today, which is
 * false") where both cases silently rendered the identical message, reading as a factual claim
 * about today's schedule when SPORTS_BETTING_URL/TOKEN just hadn't been set at all.
 */
export function GamesList() {
  const { data, isLoading, error } = useQuery<GamesResponse, ApiError>({
    queryKey: ["sports-games"],
    queryFn: () => apiFetch<GamesResponse>("/api/sports/games"),
    refetchInterval: 2 * 60 * 1000, // Matches sports-betting's own 2-min live-score cache TTL.
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading games…</p>;
  if (error) return <p className="text-sm text-amber-700 dark:text-amber-400">{error.message}</p>;

  if (data && !data.configured) {
    return (
      <p className="text-sm text-neutral-400">
        Not connected to sports-betting yet — set{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">SPORTS_BETTING_URL</code>{" "}
        and{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">SPORTS_BETTING_TOKEN</code>{" "}
        in your <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">.env</code>, then
        restart.
      </p>
    );
  }

  const groups = data?.groups ?? [];
  if (groups.length === 0) {
    return <p className="text-sm text-neutral-400">No MLB or NFL games today.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.sport} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {group.label}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.favorites.map((game) => (
              <GameCard key={`${game.sport}-${game.awayTeam}-${game.homeTeam}`} game={game} />
            ))}
          </div>
          {group.favorites.length > 0 && group.others.length > 0 && (
            <div className="border-t border-neutral-200 dark:border-neutral-800" />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.others.map((game) => (
              <GameCard key={`${game.sport}-${game.awayTeam}-${game.homeTeam}`} game={game} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
