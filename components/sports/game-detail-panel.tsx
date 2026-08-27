"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BoxscorePanel } from "./boxscore-panel";
import type { GameDTO } from "@/lib/sports/types";

function formatMoneyline(value: number | null): string {
  if (value === null) return "—";
  return value > 0 ? `+${value}` : `${value}`;
}

/**
 * Home's detail sheet for a favorite-team game candidate — same score/status/odds header as
 * components/sports/game-card.tsx, plus the boxscore expanded by default (the sheet is already
 * a deliberate "show me more" action, unlike the games-list card where stats stay collapsed).
 */
export function GameDetailPanel({ game }: { game: GameDTO }) {
  const isLive = game.status === "Live";
  const isFinal = game.status === "Final";
  const [expanded, setExpanded] = useState(true);
  const canShowStats = game.sport === "mlb" && game.gamePk !== null && (isLive || isFinal);

  return (
    <div className="flex flex-col gap-3">
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
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
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
            className="flex items-center gap-1 self-start border-t border-neutral-100 pt-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Stats &amp; analysis
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {expanded && <BoxscorePanel gamePk={game.gamePk!} />}
        </>
      )}

      {!isLive && !isFinal && !game.odds && (
        <p className="text-xs text-neutral-400">No odds or stats yet — check back closer to kickoff.</p>
      )}
    </div>
  );
}
