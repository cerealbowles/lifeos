"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import type { GrowPlantCheckInDTO } from "@/lib/growing/types";

/**
 * Check-in history — added because grow_plants.stage/trichome_status/notes are a single
 * mutable row that check-ins overwrite in place, so a "Nutrients on 8/24" note had no trace
 * left once the next check-in overwrote the same columns. Same chronological-list
 * presentation as PlantPhotos, refetched on the same "grow-plant-checkins" query key that
 * PlantDetail invalidates after a successful check-in.
 */
export function PlantCheckIns({ plantId }: { plantId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["grow-plant-checkins", plantId],
    queryFn: () => apiFetch<{ checkIns: GrowPlantCheckInDTO[] }>(`/api/grow/${plantId}/check-in`),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;
  const checkIns = data?.checkIns ?? [];

  if (checkIns.length === 0) {
    return <p className="text-sm text-neutral-400">No check-ins logged yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      {checkIns.map((c) => (
        <li key={c.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {format(new Date(c.checkedAt), "EEE, MMM d 'at' h:mm a")}
            </p>
            {c.stage && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {c.stage}
              </span>
            )}
            {c.trichomeStatus && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                trichomes: {c.trichomeStatus}
              </span>
            )}
          </div>
          {c.notes && <p className="text-sm">{c.notes}</p>}
        </li>
      ))}
    </ul>
  );
}
