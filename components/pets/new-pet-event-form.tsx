"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PET_EVENT_TYPES, type PetEventType } from "@/lib/db/schema";
import type { PetEventDTO } from "@/lib/pets/types";

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

export function NewPetEventForm({ petId }: { petId: string }) {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState<PetEventType>("vet_appointment");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [repeats, setRepeats] = useState(false);
  const [intervalDays, setIntervalDays] = useState(30);

  const mutation = useMutation<{ event: PetEventDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ event: PetEventDTO }>(`/api/pets/${petId}/events`, {
        method: "POST",
        body: JSON.stringify({
          eventType,
          title,
          scheduledAt: scheduledAt || undefined,
          recurrenceRule: repeats ? { type: "interval", days: intervalDays } : undefined,
        }),
      }),
    onSuccess: () => {
      setTitle("");
      setScheduledAt("");
      setRepeats(false);
      queryClient.invalidateQueries({ queryKey: ["pet-events", petId] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        mutation.mutate();
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as PetEventType)}
          className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
        >
          {PET_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Heartworm medication)"
          className="max-w-xs"
        />
        <Input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-40" />
        <Button type="submit" size="sm" disabled={mutation.isPending || !title.trim()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <input type="checkbox" checked={repeats} onChange={(e) => setRepeats(e.target.checked)} />
        Repeats every
        <input
          type="number"
          min={1}
          value={intervalDays}
          onChange={(e) => setIntervalDays(Number(e.target.value))}
          disabled={!repeats}
          className="w-16 rounded border border-neutral-200 bg-transparent px-1 py-0.5 dark:border-neutral-800"
        />
        days
      </label>

      {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
