"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MapPin, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { MomentDTO } from "@/lib/moments/types";

/**
 * DECISIONS.md ADR-096 — chronological scroll, per the design doc's own explicitly-flagged
 * open question ("group by day/week, or a flat chronological scroll?"). Picked flat: a photo
 * journal reads naturally newest-first with a date under each entry, and day/week grouping
 * headers add structure this isn't dense enough to need yet — revisit if volume grows. Newest
 * first comes straight from the query (`listLogEntries`'s `orderBy(desc(occurredAt))`), not
 * re-sorted here.
 *
 * DECISIONS.md ADR-108 — single column full-width on mobile (a photo journal you scroll
 * through), but a multi-column grid of smaller square-cropped cards on desktop, where a tall
 * single column of full-size photos wastes most of the screen's width.
 */
export function MomentsList() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["moments"],
    queryFn: () => apiFetch<{ moments: MomentDTO[] }>("/api/moments"),
  });

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await apiFetch(`/api/moments/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["moments"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;
  const moments = data?.moments ?? [];

  if (moments.length === 0) {
    return <p className="text-sm text-neutral-400">Nothing logged yet — post a photo above.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {moments.map((m) => (
        <div key={m.id} className="flex flex-col gap-2 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element -- proxied through our own
              server (see app/api/moments/[id]/image/route.ts), not eligible for next/image's
              remote-domain optimization since the source is a per-user Immich instance. */}
          <img src={m.imageUrl} alt={m.caption ?? "Moment"} className="aspect-square w-full object-cover" />
          <div className="flex items-start justify-between gap-2 px-2.5 pb-2.5">
            <div className="min-w-0 flex-1">
              {m.caption && <p className="truncate text-sm">{m.caption}</p>}
              <p className="flex items-center gap-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                {format(new Date(m.occurredAt), "MMM d 'at' h:mm a")}
                {m.location && (
                  <>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{m.location}</span>
                  </>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={deletingId === m.id}
              onClick={() => handleDelete(m.id)}
              aria-label="Delete moment"
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
