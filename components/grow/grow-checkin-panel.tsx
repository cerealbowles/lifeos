"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROW_STAGES, TRICHOME_STATUSES } from "@/lib/db/schema";
import { dayCount } from "@/lib/growing/day";
import { PlantCheckIns } from "./plant-checkins";
import type { GrowPlantDTO } from "@/lib/growing/types";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Home's quick-action view for a grow candidate (ADR-124 "one tap away") — the check-in form
 * from components/grow/plant-detail.tsx, trimmed to what's worth surfacing without leaving
 * Home: stage/trichome/notes and recent history. Photos/album config/delete stay behind
 * "View full plant page" since those aren't part of the daily check-in decision.
 */
export function GrowCheckInPanel({ plantId, onCheckedIn }: { plantId: string; onCheckedIn: () => void }) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<string>("");
  const [trichomeStatus, setTrichomeStatus] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading, error } = useQuery<{ plant: GrowPlantDTO }, ApiError>({
    queryKey: ["grow-plant", plantId],
    queryFn: () => apiFetch<{ plant: GrowPlantDTO }>(`/api/grow/${plantId}`),
  });

  if (data && !initialized) {
    setStage(data.plant.stage);
    setTrichomeStatus(data.plant.trichomeStatus ?? "");
    setInitialized(true);
  }

  const checkIn = useMutation<unknown, ApiError>({
    mutationFn: () =>
      apiFetch(`/api/grow/${plantId}/check-in`, {
        method: "POST",
        body: JSON.stringify({
          stage,
          trichomeStatus: trichomeStatus || null,
          notes: notes || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grow-plant", plantId] });
      queryClient.invalidateQueries({ queryKey: ["grow-plant-checkins", plantId] });
      queryClient.invalidateQueries({ queryKey: ["grow-plants"] });
      onCheckedIn();
    },
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (error || !data) return <p className="text-sm text-red-600">{error?.message ?? "Plant not found."}</p>;

  const { plant } = data;
  const today = todayDateString();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Day {dayCount(plant.datePlanted, today)} · planted {plant.datePlanted}
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {plant.lastCheckedAt
            ? `Last checked ${formatDistanceToNow(new Date(plant.lastCheckedAt), { addSuffix: true })}`
            : "Never checked"}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          checkIn.mutate();
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            Stage
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
            >
              {GROW_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            Trichomes
            <select
              value={trichomeStatus}
              onChange={(e) => setTrichomeStatus(e.target.value)}
              className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
            >
              <option value="">Not set</option>
              {TRICHOME_STATUSES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
        <Button type="submit" size="sm" className="w-fit" disabled={checkIn.isPending}>
          {checkIn.isPending ? "Checking in…" : "Check in"}
        </Button>
        {checkIn.isError && <p className="text-xs text-red-600">{checkIn.error.message}</p>}
      </form>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Recent history</h3>
        <PlantCheckIns plantId={plantId} />
      </div>

      <Link href={`/grow/${plantId}`} className="text-xs font-medium text-neutral-500 hover:underline dark:text-neutral-400">
        View full plant page →
      </Link>
    </div>
  );
}
