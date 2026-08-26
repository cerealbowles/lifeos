"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RecurrenceType } from "@/lib/db/schema";
import type { RoutineDTO } from "@/lib/tasks/types";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export function NewRoutineForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("interval");
  const [intervalDays, setIntervalDays] = useState(30);
  const [weeklyDays, setWeeklyDays] = useState<string[]>([]);
  const [monthlyDay, setMonthlyDay] = useState(1);

  const mutation = useMutation<{ routine: RoutineDTO }, ApiError>({
    mutationFn: () => {
      const recurrenceConfig =
        recurrenceType === "interval"
          ? { type: "interval" as const, days: intervalDays }
          : recurrenceType === "weekly"
            ? { type: "weekly" as const, daysOfWeek: weeklyDays }
            : { type: "monthly_day" as const, day: monthlyDay };

      return apiFetch<{ routine: RoutineDTO }>("/api/routines", {
        method: "POST",
        body: JSON.stringify({ name, recurrenceType, recurrenceConfig }),
      });
    },
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
  });

  const canSubmit = name.trim().length > 0 && (recurrenceType !== "weekly" || weeklyDays.length > 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        mutation.mutate();
      }}
      className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Routine name (e.g. Water indoor plants)"
          className="max-w-xs"
        />
        <select
          value={recurrenceType}
          onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
          className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
        >
          <option value="interval">Every N days</option>
          <option value="weekly">Weekly, on days</option>
          <option value="monthly_day">Monthly, on day</option>
        </select>

        {recurrenceType === "interval" && (
          <Input
            type="number"
            min={1}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value))}
            className="w-20"
          />
        )}

        {recurrenceType === "monthly_day" && (
          <Input
            type="number"
            min={1}
            max={31}
            value={monthlyDay}
            onChange={(e) => setMonthlyDay(Number(e.target.value))}
            className="w-20"
          />
        )}

        <Button type="submit" size="sm" disabled={mutation.isPending || !canSubmit}>
          <Plus className="h-4 w-4" />
          Add routine
        </Button>
      </div>

      {recurrenceType === "weekly" && (
        <div className="flex flex-wrap gap-1">
          {DAYS.map((day) => {
            const active = weeklyDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() =>
                  setWeeklyDays((prev) => (active ? prev.filter((d) => d !== day) : [...prev, day]))
                }
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  active
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      )}

      {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
