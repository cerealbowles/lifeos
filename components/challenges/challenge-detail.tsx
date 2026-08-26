"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ChallengeDetailDTO } from "@/lib/challenges/types";

/**
 * DECISIONS.md ADR-091. One unified interactive grid (habits × elapsed days, today's column
 * included) rather than a read-only history view plus a separate checklist for today — the
 * grid itself IS the "mark it off when I complete it, see how I'm doing" journal the request
 * asked for. Cells for any elapsed day are toggleable, not just today's, so a forgotten
 * check-in is a click away to fix rather than permanently lost.
 */
export function ChallengeDetail({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newHabitTitle, setNewHabitTitle] = useState("");

  const { data, isLoading, error } = useQuery<ChallengeDetailDTO, ApiError>({
    queryKey: ["challenge", challengeId],
    queryFn: () => apiFetch<ChallengeDetailDTO>(`/api/challenges/${challengeId}`),
  });

  const toggle = useMutation<{ completed: boolean }, ApiError, { habitId: string; date: string }>({
    mutationFn: ({ habitId, date }) =>
      apiFetch(`/api/challenges/${challengeId}/completions`, { method: "POST", body: JSON.stringify({ habitId, date }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] }),
  });

  const addHabit = useMutation<unknown, ApiError>({
    mutationFn: () =>
      apiFetch(`/api/challenges/${challengeId}/habits`, { method: "POST", body: JSON.stringify({ title: newHabitTitle }) }),
    onSuccess: () => {
      setNewHabitTitle("");
      queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] });
    },
  });

  const removeHabit = useMutation<unknown, ApiError, string>({
    mutationFn: (habitId) => apiFetch(`/api/challenges/${challengeId}/habits/${habitId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] }),
  });

  const updateStatus = useMutation<unknown, ApiError, "completed" | "abandoned" | "active">({
    mutationFn: (status) => apiFetch(`/api/challenges/${challengeId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });

  const deleteChallenge = useMutation<unknown, ApiError>({
    mutationFn: () => apiFetch(`/api/challenges/${challengeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      router.push("/challenges");
    },
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (error || !data) return <p className="text-sm text-red-600">{error?.message ?? "Challenge not found."}</p>;

  const { challenge, habits, dates, todayDate } = data;
  const completedSet = new Set(data.completedSet);
  const isDone = (habitId: string, date: string) => completedSet.has(`${habitId}:${date}`);

  const todayDoneCount = habits.filter((h) => isDone(h.id, todayDate)).length;
  const overDuration = data.day > challenge.durationDays;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{challenge.name}</h1>
            {challenge.status !== "active" && <Badge variant="outline">{challenge.status}</Badge>}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {overDuration ? `${challenge.durationDays}-day program finished` : `Day ${data.day} of ${challenge.durationDays}`}
            {" · "}
            {todayDoneCount} of {habits.length} done today
          </p>
        </div>
        {challenge.status === "active" && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => updateStatus.mutate("completed")}>
              Mark complete
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => updateStatus.mutate("abandoned")}>
              Abandon
            </Button>
          </div>
        )}
        {challenge.status !== "active" && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => updateStatus.mutate("active")}>
              Reactivate
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => deleteChallenge.mutate()}>
              <Trash2 className="h-4 w-4 text-neutral-400" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Today's checklist — larger touch targets for the thing you actually do every day. */}
      <div className="flex flex-col gap-2">
        {habits.map((habit) => {
          const done = isDone(habit.id, todayDate);
          // DECISIONS.md ADR-095/ADR-106 — a workout-matched habit auto-checks from the
          // workouts log as a convenience, but manual toggling always stays available too
          // (a forgotten workout log shouldn't mean a forever-unchecked box) — "from workout
          // log" is now just an informational label, not a disabled state.
          return (
            <div key={habit.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggle.mutate({ habitId: habit.id, date: todayDate })}
                disabled={toggle.isPending}
                className={cn(
                  "flex flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    done ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 dark:border-neutral-600",
                  )}
                >
                  {done && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {habit.title}
                {habit.autoCheck && (
                  <span className="ml-auto shrink-0 text-xs text-neutral-400">counts from workout log</span>
                )}
              </button>
              {challenge.status === "active" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={removeHabit.isPending}
                  onClick={() => removeHabit.mutate(habit.id)}
                  aria-label={`Remove ${habit.title}`}
                >
                  <Trash2 className="h-4 w-4 text-neutral-400" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {challenge.status === "active" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newHabitTitle.trim()) return;
            addHabit.mutate();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={newHabitTitle}
            onChange={(e) => setNewHabitTitle(e.target.value)}
            placeholder="Add another habit"
            className="max-w-[260px]"
          />
          <Button type="submit" size="sm" variant="outline" disabled={addHabit.isPending || !newHabitTitle.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
      )}

      {/* Progress grid — every elapsed day, every habit, clickable to fix a forgotten
          check-in on a past day, not just today. */}
      {dates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white pr-2 text-left font-medium text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                  Habit
                </th>
                {dates.map((date, i) => (
                  <th
                    key={date}
                    title={date}
                    className={cn(
                      "w-6 min-w-6 px-0 text-center font-normal",
                      date === todayDate ? "font-semibold text-accent dark:text-accent-dark" : "text-neutral-400",
                    )}
                  >
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => (
                <tr key={habit.id}>
                  <td className="sticky left-0 max-w-[160px] truncate bg-white pr-2 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
                    {habit.title}
                  </td>
                  {dates.map((date) => {
                    const done = isDone(habit.id, date);
                    const isToday = date === todayDate;
                    return (
                      <td
                        key={date}
                        title={date}
                        className={cn("p-0 text-center", isToday && "rounded ring-1 ring-accent dark:ring-accent-dark")}
                      >
                        <button
                          type="button"
                          onClick={() => toggle.mutate({ habitId: habit.id, date })}
                          disabled={toggle.isPending}
                          aria-label={`${habit.title} on ${date}${isToday ? " (today)" : ""}${done ? ", completed" : ""}${habit.autoCheck ? " (counts from workout log)" : ""}`}
                          className={cn(
                            "h-5 w-5 rounded",
                            done ? "bg-emerald-500" : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(toggle.isError || addHabit.isError || removeHabit.isError || updateStatus.isError || deleteChallenge.isError) && (
        <p className="text-xs text-red-600">
          {(toggle.error ?? addHabit.error ?? removeHabit.error ?? updateStatus.error ?? deleteChallenge.error)?.message}
        </p>
      )}
    </div>
  );
}
