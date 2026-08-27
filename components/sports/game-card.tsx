"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BoxscorePanel } from "./boxscore-panel";
import type { GameDTO } from "@/lib/sports/types";

function formatMoneyline(value: number | null): string {
  if (value === null) return "—";
  return value > 0 ? `+${value}` : `${value}`;
}

/**
 * DECISIONS.md ADR-099. One card per game — team abbrs, score, live status/period, and
 * FanDuel odds when sports-betting has them (pre-game lines mostly; may thin out once a game
 * goes final). `isFavorite` gets a small star + slightly stronger border, not a different
 * layout — the elevation into its own section (components/sports/games-list.tsx) already does
 * the heavy lifting of surfacing it; the card itself just needs a quiet marker.
 */
export function GameCard({ game }: { game: GameDTO }) {
  const isLive = game.status === "Live";
  const isFinal = game.status === "Final";
  const [expanded, setExpanded] = useState(false);
  const canShowStats = game.sport === "mlb" && game.gamePk !== null && (isLive || isFinal);

  return (
    <Card className={game.isFavorite ? "border-amber-300 dark:border-amber-800" : undefined}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            {game.isFavorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
            {game.awayTeam} @ {game.homeTeam}
          </div>
          {isLive ? (
            <Badge variant="due">Live</Badge>
          ) : isFinal ? (
            <Badge variant="outline">Final</Badge>
          ) : (
            <Badge>{game.startAt ? format(new Date(game.startAt), "EEE h:mm a") : "Scheduled"}</Badge>
          )}
        </div>

        {(isLive || isFinal) && (
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-4">
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-semibold tabular-nums">{game.awayScore ?? "—"}</span>
                <span className="text-[10px] text-neutral-400">{game.awayTeam}</span>
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-semibold tabular-nums">{game.homeScore ?? "—"}</span>
                <span className="text-[10px] text-neutral-400">{game.homeTeam}</span>
              </span>
            </div>
            {isLive && game.period && (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{game.period}</span>
            )}
          </div>
        )}

        {game.odds && (
          <div className="flex items-center gap-3 border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <span>
              ML {game.awayTeam} {formatMoneyline(game.odds.awayMoneyline)} · {game.homeTeam}{" "}
              {formatMoneyline(game.odds.homeMoneyline)}
            </span>
            {game.odds.totalLine !== null && (
              <span>
                O/U {game.odds.totalLine} ({formatMoneyline(game.odds.overOdds)}/{formatMoneyline(game.odds.underOdds)})
              </span>
            )}
          </div>
        )}

        {canShowStats && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 self-start text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Stats &amp; analysis
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {expanded && <BoxscorePanel gamePk={game.gamePk!} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
