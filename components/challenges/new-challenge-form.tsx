"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChallengeDTO, ChallengeHabitDTO } from "@/lib/challenges/types";

const SEVENTY_FIVE_HARD_HABITS = [
  "Workout 1 (45 min)",
  "Workout 2 (45 min, outdoors)",
  "Follow a diet — no cheat meals or alcohol",
  "Drink a gallon of water",
  "Read 10 pages (non-fiction)",
  "Take a progress photo",
];

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * DECISIONS.md ADR-091. Habits are defined once, at creation — matches the actual shape of a
 * program like 75 Hard (the rules are fixed for the whole run), not an ever-editable to-do
 * list. The "75 Hard" quick-fill button exists because that's the specific example that
 * prompted this feature — a fast path for the most common case, not the only supported one
 * (name/duration/habits are all freely editable for any other kind of challenge).
 */
export function NewChallengeForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayDateString());
  const [durationDays, setDurationDays] = useState("75");
  const [habitTitles, setHabitTitles] = useState<string[]>([""]);

  const mutation = useMutation<{ challenge: ChallengeDTO; habits: ChallengeHabitDTO[] }, ApiError>({
    mutationFn: () =>
      apiFetch("/api/challenges", {
        method: "POST",
        body: JSON.stringify({
          name,
          startDate,
          durationDays: Number(durationDays),
          habitTitles: habitTitles.map((t) => t.trim()).filter(Boolean),
        }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      router.push(`/challenges/${data.challenge.id}`);
    },
  });

  function fillSeventyFiveHard() {
    setName("75 Hard");
    setDurationDays("75");
    setHabitTitles(SEVENTY_FIVE_HARD_HABITS);
  }

  function setHabitAt(index: number, value: string) {
    setHabitTitles((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function removeHabitAt(index: number) {
    setHabitTitles((prev) => prev.filter((_, i) => i !== index));
  }

  const validHabitCount = habitTitles.filter((t) => t.trim()).length;
  const canSubmit = name.trim().length > 0 && startDate && Number(durationDays) > 0 && validHabitCount > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        mutation.mutate();
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Challenge name" className="max-w-[220px]" />
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        <Input
          type="number"
          min={1}
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          placeholder="Days"
          className="w-24"
        />
        <Button type="button" variant="outline" size="sm" onClick={fillSeventyFiveHard}>
          Use 75 Hard
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Habits to track every day</p>
        {habitTitles.map((title, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setHabitAt(i, e.target.value)}
              placeholder={`Habit ${i + 1}`}
              className="max-w-[320px]"
            />
            {habitTitles.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeHabitAt(i)} aria-label="Remove habit">
                <Trash2 className="h-4 w-4 text-neutral-400" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setHabitTitles((prev) => [...prev, ""])}
        >
          <Plus className="h-4 w-4" />
          Add habit
        </Button>
      </div>

      <Button type="submit" size="sm" className="w-fit" disabled={mutation.isPending || !canSubmit}>
        Start challenge
      </Button>
      {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
