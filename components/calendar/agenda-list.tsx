"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { Trash2, MapPin } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { DomainAvatar } from "@/components/dashboard/domain-icon";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import type { EventDTO } from "@/lib/calendar/types";

export function AgendaList() {
  const queryClient = useQueryClient();
  const { collapseThen, isCollapsing } = useCollapseThen();

  const { data, isLoading, error } = useQuery<{ events: EventDTO[] }, ApiError>({
    queryKey: ["calendar-events"],
    queryFn: () => apiFetch<{ events: EventDTO[] }>("/api/calendar/events"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/calendar/events/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading events…</p>;

  if (error) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-400">
        {error.message} Showing whatever was last synced successfully.
      </p>
    );
  }

  const events = (data?.events ?? []).filter((e) => e.status !== "cancelled");
  if (events.length === 0) {
    return <p className="text-sm text-neutral-400">Nothing on the calendar in the next 60 days.</p>;
  }

  const groups: Array<{ day: Date; events: EventDTO[] }> = [];
  for (const event of events) {
    const day = new Date(event.startAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && isSameDay(lastGroup.day, day)) {
      lastGroup.events.push(event);
    } else {
      groups.push({ day, events: [event] });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.day.toISOString()}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {format(group.day, "EEEE, MMMM d")}
          </h3>
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {group.events.map((event) => (
              <CollapsibleItem key={event.id} collapsed={isCollapsing(event.id)}>
                <div className="flex items-center gap-3 py-2">
                  <DomainAvatar domain="calendar" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{event.allDay ? "All day" : format(new Date(event.startAt), "h:mm a")}</span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {event.location}
                        </span>
                      )}
                    </p>
                  </div>
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
        </div>
      ))}
    </div>
  );
}
