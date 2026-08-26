"use client";

import { useMemo } from "react";
import { addDays, endOfWeek, format, isToday, startOfWeek } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { EventDTO } from "@/lib/calendar/types";

/**
 * Deliberately not an hour-by-hour time grid (Google-Calendar-style, with events positioned
 * by vertical offset/height) — this app's events are lightweight personal appointments, not a
 * packed professional schedule, so a simpler 7-day-column list gives the week's shape at a
 * glance without the extra layout complexity an hourly grid would need. Distinct from Agenda
 * (a flat, 67-day-window scroll) by showing the whole week side-by-side, and from Month
 * (which truncates busy days) by showing every event in full.
 */
export function WeekGrid({ anchorDate }: { anchorDate: Date }) {
  const weekStart = startOfWeek(anchorDate);
  const weekEnd = endOfWeek(anchorDate);

  const { data, isLoading, error } = useQuery<{ events: EventDTO[] }, ApiError>({
    queryKey: ["calendar-events", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () =>
      apiFetch<{ events: EventDTO[] }>(
        `/api/calendar/events?start=${encodeURIComponent(weekStart.toISOString())}&end=${encodeURIComponent(weekEnd.toISOString())}`,
      ),
  });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventDTO[]>();
    for (const event of data?.events ?? []) {
      if (event.status === "cancelled") continue;
      const key = format(new Date(event.startAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [data]);

  if (isLoading) return <p className="text-sm text-neutral-400">Loading week…</p>;
  if (error) return <p className="text-sm text-amber-700 dark:text-amber-400">{error.message}</p>;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayEvents = (eventsByDay.get(key) ?? []).sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );
        const today = isToday(day);

        return (
          <div
            key={key}
            className={cn(
              "flex min-h-24 flex-col gap-1 rounded-md border p-2",
              today ? "border-indigo-300 dark:border-indigo-800" : "border-neutral-200 dark:border-neutral-800",
            )}
          >
            <p
              className={cn(
                "text-xs font-semibold",
                today ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-500 dark:text-neutral-400",
              )}
            >
              {format(day, "EEE d")}
            </p>
            {dayEvents.length === 0 ? (
              <p className="text-[11px] text-neutral-300 dark:text-neutral-700">—</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {dayEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded bg-indigo-50 px-1.5 py-1 text-[11px] text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                  >
                    <p className="truncate font-medium">{event.title}</p>
                    <p className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400">
                      <span>{event.allDay ? "All day" : format(new Date(event.startAt), "h:mm a")}</span>
                      {event.location && (
                        <span className="flex min-w-0 items-center gap-0.5 truncate">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          {event.location}
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
