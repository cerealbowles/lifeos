"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { GrowPlantPhotoDTO } from "@/lib/growing/types";

/**
 * DECISIONS.md ADR-097 — same chronological-scroll presentation as
 * components/moments/moments-list.tsx, per Geoff's explicit ask to view a plant's photos "in
 * the app like we do for the Feed."
 */
export function PlantPhotos({ plantId }: { plantId: string }) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["grow-plant-photos", plantId],
    queryFn: () => apiFetch<{ photos: GrowPlantPhotoDTO[] }>(`/api/grow/${plantId}/photos`),
  });

  async function handleDelete(photoId: string) {
    setDeletingId(photoId);
    setError(null);
    try {
      await apiFetch(`/api/grow/${plantId}/photos/${photoId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["grow-plant-photos", plantId] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;
  const photos = data?.photos ?? [];

  if (photos.length === 0) {
    return <p className="text-sm text-neutral-400">No photos yet — post one above.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {photos.map((p) => (
        <div
          key={p.id}
          className="flex flex-col gap-2 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- proxied through our own
              server (app/api/grow/[id]/photos/[photoId]/image/route.ts), not eligible for
              next/image's remote-domain optimization since the source is a per-user Immich
              instance. */}
          <img src={p.imageUrl} alt={p.caption ?? "Plant photo"} className="max-h-96 w-full object-cover" />
          <div className="flex items-start justify-between gap-2 px-3 pb-3">
            <div className="min-w-0 flex-1">
              {p.caption && <p className="text-sm">{p.caption}</p>}
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {format(new Date(p.takenAt), "EEE, MMM d 'at' h:mm a")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={deletingId === p.id}
              onClick={() => handleDelete(p.id)}
              aria-label="Delete photo"
            >
              <Trash2 className="h-3.5 w-3.5 text-neutral-400" />
            </Button>
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
