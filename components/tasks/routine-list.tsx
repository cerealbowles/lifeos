"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, SkipForward } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { DueBadge } from "@/components/dashboard/due-badge";
import { getDueSummary } from "@/lib/tasks/status";
import type { RoutineDTO } from "@/lib/tasks/types";

function describeRecurrence(routine: RoutineDTO): string {
  const c = routine.recurrenceConfig;
  if (c.type === "interval") return `Every ${c.days} days`;
  if (c.type === "weekly") return `Weekly: ${c.daysOfWeek.join(", ")}`;
  return `Monthly on day ${c.day}`;
}

export function RoutineList({ timezone }: { timezone: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["routines"],
    queryFn: () => apiFetch<{ routines: RoutineDTO[] }>("/api/routines"),
  });

  const complete = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/routines/${id}/complete`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routines"] }),
  });

  const skip = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/routines/${id}/skip`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routines"] }),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading routines…</p>;

  const routines = data?.routines ?? [];
  if (routines.length === 0) {
    return <p className="text-sm text-neutral-400">No recurring routines yet. Add one above.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      {routines.map((routine) => (
        <li key={routine.id} className="flex items-center gap-3 py-2">
          <div className="flex-1">
            <p className="text-sm">{routine.name}</p>
            <p className="text-xs text-neutral-400">{describeRecurrence(routine)}</p>
          </div>
          <DueBadge due={getDueSummary(routine.nextDueAt ? new Date(routine.nextDueAt) : null, timezone)} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={skip.isPending}
            onClick={() => skip.mutate(routine.id)}
            aria-label={`Skip ${routine.name}`}
          >
            <SkipForward className="h-4 w-4 text-neutral-400" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={complete.isPending}
            onClick={() => complete.mutate(routine.id)}
            aria-label={`Complete ${routine.name}`}
          >
            <Check className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
