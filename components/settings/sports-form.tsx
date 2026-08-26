"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { SPORT_OPTIONS, listTeams } from "@/lib/sports/teams";
import type { FavoriteTeamDTO } from "@/lib/sports/types";

/**
 * DECISIONS.md ADR-099. Replaces the old ESPN team-search flow (a league picker + free-text
 * search + results list) with a plain two-step dropdown, since sports-betting has no
 * team-search endpoint — just fixed abbreviations from lib/sports/teams.ts's static list.
 * Simpler UX too: no "search, wait, pick from results" round trip for a closed 30/32-team set.
 */
export function SportsForm() {
  const queryClient = useQueryClient();
  const [sport, setSport] = useState<string>(SPORT_OPTIONS[0].key);
  const [teamAbbr, setTeamAbbr] = useState<string>(listTeams(SPORT_OPTIONS[0].key)[0]?.abbr ?? "");

  const { data: followedData } = useQuery({
    queryKey: ["favorite-teams"],
    queryFn: () => apiFetch<{ teams: FavoriteTeamDTO[] }>("/api/sports/teams"),
  });
  const followed = followedData?.teams ?? [];

  const addTeam = useMutation<unknown, ApiError>({
    mutationFn: () => apiFetch("/api/sports/teams", { method: "POST", body: JSON.stringify({ sport, teamAbbr }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-teams"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["sports-games"] });
    },
  });

  const removeTeam = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/sports/teams/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-teams"] });
      queryClient.invalidateQueries({ queryKey: ["sports-games"] });
    },
  });

  const teamsForSport = listTeams(sport);

  return (
    <div className="flex flex-col gap-4">
      {followed.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {followed.map((team) => (
            <li key={team.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex-1">
                {team.teamName} <span className="text-neutral-400">· {team.sport.toUpperCase()}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTeam.mutate(team.id)}
                aria-label={`Stop following ${team.teamName}`}
              >
                <Trash2 className="h-4 w-4 text-neutral-400" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!teamAbbr) return;
          addTeam.mutate();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <select
          value={sport}
          onChange={(e) => {
            setSport(e.target.value);
            setTeamAbbr(listTeams(e.target.value)[0]?.abbr ?? "");
          }}
          className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
        >
          {SPORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={teamAbbr}
          onChange={(e) => setTeamAbbr(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
        >
          {teamsForSport.map((t) => (
            <option key={t.abbr} value={t.abbr}>
              {t.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={!teamAbbr || addTeam.isPending}>
          <Plus className="h-4 w-4" />
          Follow
        </Button>
      </form>

      {addTeam.isError && <p className="text-xs text-red-600">{addTeam.error.message}</p>}
    </div>
  );
}
