"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { MeasurementDTO } from "@/lib/measurements/types";

const RECENT_COUNT = 8;

/**
 * The actual "journal" list — lets a mis-entered reading be removed, which the chart alone
 * doesn't offer. Reuses the same range=all fetch the chart's "All" view would use rather than
 * adding a separate paginated/limit endpoint variant — a personal weight log realistically
 * tops out at a few thousand rows even after years of daily entries, cheap enough to fetch
 * and slice client-side for "most recent 8."
 */
export function WeightLog({ unit }: { unit: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["measurements", "weight", "all"],
    queryFn: () => apiFetch<{ measurements: MeasurementDTO[] }>("/api/measurements?type=weight&range=all"),
  });

  const recent = [...(data?.measurements ?? [])].reverse().slice(0, RECENT_COUNT);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await apiFetch(`/api/measurements/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return null;
  if (recent.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
        {recent.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 py-1.5">
            <span>
              {m.value} {unit}
            </span>
            <span className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              {formatDistanceToNow(new Date(m.measuredAt), { addSuffix: true })}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={deletingId === m.id}
                onClick={() => handleDelete(m.id)}
                aria-label={`Delete ${m.value} ${unit} reading`}
              >
                <Trash2 className="h-3.5 w-3.5 text-neutral-400" />
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
