"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Activity as ActivityIcon, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

/**
 * Session data is a server-fetched prop (not a useQuery cache), so the delete here uses
 * router.refresh() to re-run the Health page's server component — same reasoning as
 * BottomNavForm (components/settings/bottom-nav-form.tsx): invalidating a React Query key
 * would do nothing, since nothing is subscribed to one for this list.
 */
export function ActivityLogRow({
  id,
  activityType,
  durationSeconds,
  startedAt,
}: {
  id: string;
  activityType: string;
  durationSeconds: number;
  startedAt: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/activities/sessions/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setDeleting(false);
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <li className="flex flex-col py-2">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <ActivityIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium capitalize">
            {activityType} · {formatDuration(durationSeconds)}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatDistanceToNow(new Date(startedAt), { addSuffix: true })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={deleting}
          onClick={handleDelete}
          aria-label={`Delete ${activityType} entry`}
        >
          <Trash2 className="h-4 w-4 text-neutral-400" />
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}
