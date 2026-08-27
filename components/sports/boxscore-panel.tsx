"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { BoxscoreDTO, BoxscoreSide } from "@/lib/sports/types";

function StatLine({ side }: { side: BoxscoreSide }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{side.abbr}</p>
      {side.batters.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-neutral-400">
              <th className="pb-1 text-left font-normal">Batting</th>
              <th className="pb-1 text-right font-normal">AB</th>
              <th className="pb-1 text-right font-normal">R</th>
              <th className="pb-1 text-right font-normal">H</th>
              <th className="pb-1 text-right font-normal">RBI</th>
              <th className="pb-1 text-right font-normal">BB</th>
              <th className="pb-1 text-right font-normal">SO</th>
            </tr>
          </thead>
          <tbody>
            {side.batters.map((b, i) => (
              <tr key={i}>
                <td className="py-0.5">
                  {b.name} <span className="text-neutral-400">{b.pos}</span>
                </td>
                <td className="py-0.5 text-right tabular-nums">{b.ab}</td>
                <td className="py-0.5 text-right tabular-nums">{b.r}</td>
                <td className="py-0.5 text-right tabular-nums">{b.h}</td>
                <td className="py-0.5 text-right tabular-nums">{b.rbi}</td>
                <td className="py-0.5 text-right tabular-nums">{b.bb}</td>
                <td className="py-0.5 text-right tabular-nums">{b.so}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {side.pitchers.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-neutral-400">
              <th className="pb-1 text-left font-normal">Pitching</th>
              <th className="pb-1 text-right font-normal">IP</th>
              <th className="pb-1 text-right font-normal">H</th>
              <th className="pb-1 text-right font-normal">R</th>
              <th className="pb-1 text-right font-normal">ER</th>
              <th className="pb-1 text-right font-normal">BB</th>
              <th className="pb-1 text-right font-normal">SO</th>
            </tr>
          </thead>
          <tbody>
            {side.pitchers.map((p, i) => (
              <tr key={i}>
                <td className="py-0.5">{p.name}</td>
                <td className="py-0.5 text-right tabular-nums">{p.ip}</td>
                <td className="py-0.5 text-right tabular-nums">{p.h}</td>
                <td className="py-0.5 text-right tabular-nums">{p.r}</td>
                <td className="py-0.5 text-right tabular-nums">{p.er}</td>
                <td className="py-0.5 text-right tabular-nums">{p.bb}</td>
                <td className="py-0.5 text-right tabular-nums">{p.so}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * Batting/pitching lines for one MLB game, fetched on demand when a game card is expanded
 * (components/sports/game-card.tsx) — not on every games-list load, matching sports-betting's
 * own "fetched on demand" doc comment on GET /api/mlb/game/<pk>/boxscore.
 */
export function BoxscorePanel({ gamePk }: { gamePk: number }) {
  const { data, isLoading, error } = useQuery<BoxscoreDTO, ApiError>({
    queryKey: ["sports-boxscore", gamePk],
    queryFn: () => apiFetch<BoxscoreDTO>(`/api/sports/games/mlb/${gamePk}/boxscore`),
    refetchInterval: 2 * 60 * 1000,
  });

  if (isLoading) return <p className="text-xs text-neutral-400">Loading stats…</p>;
  if (error) return <p className="text-xs text-amber-700 dark:text-amber-400">{error.message}</p>;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 pt-3 sm:grid-cols-2 dark:border-neutral-800">
      <StatLine side={data.away} />
      <StatLine side={data.home} />
    </div>
  );
}
