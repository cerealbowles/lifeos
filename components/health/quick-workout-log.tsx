"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Footprints, PersonStanding, Minus, Plus, Check } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS = [
  { type: "lifting", label: "Lifting", icon: Dumbbell, defaultMinutes: 30, outdoor: false },
  { type: "run", label: "Run", icon: Footprints, defaultMinutes: 30, outdoor: true },
  { type: "walk", label: "Walk", icon: PersonStanding, defaultMinutes: 20, outdoor: true },
] as const;

/**
 * DECISIONS.md ADR-095 — "quick-pick tap targets... duration stepper defaulting to typical
 * values... two taps to log, no full form." Tap 1 picks the type (reveals a stepper
 * pre-filled with that type's typical duration); tap 2 confirms without needing to touch the
 * stepper at all for the common case. Deliberately no date/note/full-form fields here — this
 * is the fast path, not the only path (the workout log below still shows everything logged,
 * and a delete button covers "logged the wrong thing").
 */
export function QuickWorkoutLog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<(typeof PRESETS)[number] | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [outdoor, setOutdoor] = useState(false);

  const mutation = useMutation<unknown, ApiError>({
    mutationFn: () =>
      apiFetch("/api/workouts", {
        method: "POST",
        body: JSON.stringify({ type: selected!.type, durationMinutes: minutes, outdoor }),
      }),
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.refresh();
    },
  });

  function pick(preset: (typeof PRESETS)[number]) {
    setSelected(preset);
    setMinutes(preset.defaultMinutes);
    setOutdoor(preset.outdoor);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.type}
              type="button"
              onClick={() => pick(preset)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                selected?.type === preset.type
                  ? "border-accent bg-accent/10 text-accent dark:border-accent-dark dark:bg-accent-dark/15 dark:text-accent-dark"
                  : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {preset.label}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => setMinutes((m) => Math.max(5, m - 5))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-16 text-center text-sm font-medium tabular-nums">{minutes} min</span>
            <Button type="button" variant="outline" size="icon" onClick={() => setMinutes((m) => m + 5)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
            <input type="checkbox" checked={outdoor} onChange={(e) => setOutdoor(e.target.checked)} />
            Outdoor
          </label>
          <Button type="button" size="sm" className="ml-auto" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            <Check className="h-4 w-4" />
            Log {selected.label.toLowerCase()}
          </Button>
        </div>
      )}
      {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
    </div>
  );
}
