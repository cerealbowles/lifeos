"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { WorkoutDTO } from "@/lib/workouts/types";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function yesterdayDateString(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * `workouts.date` is a plain date, no time component (lib/db/schema/workouts.ts) —
 * date-fns's `formatDistanceToNow` treats a bare "YYYY-MM-DD" string as UTC midnight, so
 * comparing it against "right now" produced a misleading "14 hours ago" for a workout
 * logged seconds earlier (caught live: local timezone offset from UTC turned "today" into
 * "yesterday, many hours ago"). A date-only value should read as "Today"/"Yesterday"/the
 * actual date, not a time-sensitive relative distance it was never precise enough to give.
 */
function formatWorkoutDate(date: string): string {
  if (date === todayDateString()) return "Today";
  if (date === yesterdayDateString()) return "Yesterday";
  return date;
}

/** "18:30:00" / "18:30" (Postgres `time`, HH:MM[:SS]) → "6:30 PM" — avoids the same UTC-vs-
 *  local footgun `formatWorkoutDate`'s doc comment describes: this is a bare time-of-day with
 *  no date/timezone attached, so it's formatted directly rather than round-tripped through a
 *  Date object. */
function formatWorkoutTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function WorkoutLog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => apiFetch<{ workouts: WorkoutDTO[] }>("/api/workouts"),
  });

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await apiFetch(`/api/workouts/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return null;
  const workouts = data?.workouts ?? [];
  if (workouts.length === 0) {
    return <p className="text-sm text-neutral-400">Nothing logged yet — tap a workout type above.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
        {workouts.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="capitalize">
              {w.type} · {w.durationMinutes} min{w.outdoor ? " · outdoor" : ""}
            </span>
            <span className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              {formatWorkoutDate(w.date)}
              {w.time && ` at ${formatWorkoutTime(w.time)}`}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={deletingId === w.id}
                onClick={() => handleDelete(w.id)}
                aria-label={`Delete ${w.type} workout`}
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
