"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORKOUT_TYPES } from "@/lib/db/schema/workouts";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * The counterpart to QuickWorkoutLog's fast 2-tap "log now" path — this is the full form for
 * "I forgot to log this at the time," collapsed behind a toggle so it doesn't compete with
 * the fast path for attention on every visit (ADR-095: "this is the fast path, not the only
 * path"). Date/time/duration/type are all editable since a backfilled entry has no reason to
 * assume "now" for any of them. `time` is optional — a workout can be logged with just a date
 * if the exact time doesn't matter, same as before this form existed.
 */
export function LogPastWorkoutForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayDateString());
  const [time, setTime] = useState("");
  const [type, setType] = useState<string>(WORKOUT_TYPES[0]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [outdoor, setOutdoor] = useState(false);

  const mutation = useMutation<unknown, ApiError>({
    mutationFn: () =>
      apiFetch("/api/workouts", {
        method: "POST",
        body: JSON.stringify({
          date,
          time: time || undefined,
          type,
          durationMinutes,
          outdoor,
        }),
      }),
    onSuccess: () => {
      setOpen(false);
      setDate(todayDateString());
      setTime("");
      setDurationMinutes(30);
      setOutdoor(false);
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.refresh();
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        Log a past workout
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-2.5 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm capitalize dark:border-neutral-800"
        >
          {WORKOUT_TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t}
            </option>
          ))}
        </select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" max={todayDateString()} />
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-32"
          aria-label="Time (optional)"
        />
        <Input
          type="number"
          min={5}
          step={5}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-24"
          aria-label="Duration (minutes)"
        />
        <span className="text-xs text-neutral-400">min</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
          <input type="checkbox" checked={outdoor} onChange={(e) => setOutdoor(e.target.checked)} />
          Outdoor
        </label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={mutation.isPending || durationMinutes <= 0}>
            <Check className="h-4 w-4" />
            Log workout
          </Button>
        </div>
      </div>

      {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
