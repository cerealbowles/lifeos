"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { DueBadge } from "@/components/dashboard/due-badge";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import { getDueSummary } from "@/lib/tasks/status";
import type { PetEventDTO } from "@/lib/pets/types";
import type { PetEventType } from "@/lib/db/schema";

const EVENT_TYPE_LABELS: Record<PetEventType, string> = {
  vet_appointment: "Vet appointment",
  medication: "Medication",
  vaccination: "Vaccination",
  grooming: "Grooming",
  weight: "Weight check",
  feeding: "Feeding",
  purchase: "Purchase",
  other: "Other",
};

export function PetEventsList({ petId, timezone }: { petId: string; timezone: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["pet-events", petId];
  const { collapseThen, isCollapsing } = useCollapseThen();

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiFetch<{ events: PetEventDTO[] }>(`/api/pets/${petId}/events`),
  });

  const complete = useMutation({
    mutationFn: (eventId: string) =>
      apiFetch(`/api/pets/${petId}/events/${eventId}`, { method: "PATCH", body: JSON.stringify({ completed: true }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: (eventId: string) => apiFetch(`/api/pets/${petId}/events/${eventId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading events…</p>;

  const events = data?.events ?? [];
  const upcoming = events.filter((e) => !e.completedAt);
  const history = events.filter((e) => e.completedAt);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Upcoming
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-neutral-400">Nothing scheduled.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {upcoming.map((event) => (
              <CollapsibleItem key={event.id} collapsed={isCollapsing(event.id)}>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm">{event.title}</p>
                    <p className="text-xs text-neutral-400">
                      {EVENT_TYPE_LABELS[event.eventType]}
                      {event.recurrenceRule ? " · repeats" : ""}
                    </p>
                  </div>
                  <DueBadge due={getDueSummary(event.scheduledAt ? new Date(event.scheduledAt) : null, timezone)} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={complete.isPending}
                    onClick={() => collapseThen(event.id, () => complete.mutate(event.id))}
                    aria-label={`Complete ${event.title}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => collapseThen(event.id, () => remove.mutate(event.id))}
                    aria-label={`Delete ${event.title}`}
                  >
                    <Trash2 className="h-4 w-4 text-neutral-400" />
                  </Button>
                </div>
              </CollapsibleItem>
            ))}
          </ul>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            History
          </h3>
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {history.map((event) => (
              <li key={event.id} className="flex items-center gap-3 py-2 text-sm text-neutral-400">
                <span className="flex-1 line-through">{event.title}</span>
                <span className="text-xs">{new Date(event.completedAt!).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
