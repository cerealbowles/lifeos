"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GROW_STAGES, TRICHOME_STATUSES } from "@/lib/db/schema";
import { dayCount } from "@/lib/growing/day";
import { PlantPhotoUpload } from "./plant-photo-upload";
import { PlantPhotos } from "./plant-photos";
import { PlantCheckIns } from "./plant-checkins";
import type { GrowPlantDTO } from "@/lib/growing/types";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * DECISIONS.md ADR-094/097. The stage/trichome/notes form doubles as both "edit" and "check
 * in" — no separate edit mode, matching the planning doc's "not a form-heavy tracker"
 * instruction. Submitting always advances last_checked_at (clearing Today's reminder) even if
 * nothing else changed — a "yep, still fine" check-in is a real, valid action, not just a
 * no-op.
 *
 * The Immich album field is deliberately its OWN small form with its own "Save" button
 * (PATCH /api/grow/[id], not the check-in endpoint) — bundling it into "Check in" originally
 * meant there was no visible save affordance for it at all, which was confusing in practice
 * (caught from real usage, not a design review). Config and check-in are different actions
 * now; only stage/trichome/notes still ride together as "the check-in."
 */
export function PlantDetail({ plantId }: { plantId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<string>("");
  const [trichomeStatus, setTrichomeStatus] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [immichAlbumId, setImmichAlbumId] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading, error } = useQuery<{ plant: GrowPlantDTO }, ApiError>({
    queryKey: ["grow-plant", plantId],
    queryFn: () => apiFetch<{ plant: GrowPlantDTO }>(`/api/grow/${plantId}`),
  });

  // Seed the form from the fetched plant exactly once — after that, the form is the user's
  // to edit, not something that should snap back on every background refetch. Notes
  // deliberately does NOT seed from data.plant.notes — each check-in is now its own history
  // entry (see grow_plant_checkins), not an edit of one persistent note, so the field starts
  // blank and is ready for "what's new this time."
  if (data && !initialized) {
    setStage(data.plant.stage);
    setTrichomeStatus(data.plant.trichomeStatus ?? "");
    setImmichAlbumId(data.plant.immichAlbumId ?? "");
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
      setNotes(""); // ready for the next check-in's own note, not a leftover of this one
      router.refresh();
    },
  });

  const saveAlbum = useMutation<unknown, ApiError>({
    mutationFn: () =>
      apiFetch(`/api/grow/${plantId}`, {
        method: "PATCH",
        body: JSON.stringify({ immichAlbumId: immichAlbumId || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grow-plant", plantId] });
      queryClient.invalidateQueries({ queryKey: ["grow-plants"] });
    },
  });

  const restore = useMutation<unknown, ApiError>({
    mutationFn: () => apiFetch(`/api/grow/${plantId}`, { method: "PATCH", body: JSON.stringify({ active: true }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grow-plant", plantId] });
      queryClient.invalidateQueries({ queryKey: ["grow-plants"] });
      router.refresh();
    },
  });

  const deletePlant = useMutation<unknown, ApiError>({
    mutationFn: () => apiFetch(`/api/grow/${plantId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grow-plants"] });
      router.push("/grow");
    },
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (error || !data) return <p className="text-sm text-red-600">{error?.message ?? "Plant not found."}</p>;

  const { plant } = data;
  const today = todayDateString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{plant.strain}</h1>
            {!plant.active && <Badge variant="outline">Harvested</Badge>}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Day {dayCount(plant.datePlanted, today)} · planted {plant.datePlanted}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {plant.lastCheckedAt
              ? `Last checked ${formatDistanceToNow(new Date(plant.lastCheckedAt), { addSuffix: true })}`
              : "Never checked"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!plant.active && (
            <Button type="button" variant="outline" size="sm" onClick={() => restore.mutate()}>
              Restore
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`Delete ${plant.strain}? This cannot be undone.`)) {
                deletePlant.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-neutral-400" />
            Delete
          </Button>
        </div>
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
          Check in
        </Button>
        {checkIn.isError && <p className="text-xs text-red-600">{checkIn.error.message}</p>}
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">History</h2>
        <PlantCheckIns plantId={plantId} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Photos</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAlbum.mutate();
          }}
          className="flex items-end gap-2"
        >
          <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            Immich album for this plant
            <Input
              value={immichAlbumId}
              onChange={(e) => setImmichAlbumId(e.target.value)}
              placeholder="Paste an album URL or ID"
            />
          </label>
          <Button type="submit" size="sm" variant="outline" disabled={saveAlbum.isPending}>
            {saveAlbum.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
        {saveAlbum.isError && <p className="text-xs text-red-600">{saveAlbum.error.message}</p>}
        {saveAlbum.isSuccess && <p className="text-xs text-emerald-700 dark:text-emerald-400">Album saved.</p>}

        {plant.immichAlbumId ? (
          <>
            <PlantPhotoUpload plantId={plantId} />
            <PlantPhotos plantId={plantId} />
          </>
        ) : (
          <p className="text-sm text-neutral-400">
            Save an Immich album above to start adding photos of this plant.
          </p>
        )}
      </div>
    </div>
  );
}
