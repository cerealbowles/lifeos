"use client";

import { useMemo } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { EventDTO } from "@/lib/calendar/types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Same overflow-compression instinct as Today's TODAY-tier cards (DECISIONS.md ADR-079) —
// a day with 6 events shouldn't blow out the grid, so only the first few render as chips.
const MAX_CHIPS_PER_DAY = 3;

export function MonthGrid({ anchorDate }: { anchorDate: Date }) {
  const gridStart = startOfWeek(startOfMonth(anchorDate));
  const gridEnd = endOfWeek(endOfMonth(anchorDate));

  const { data, isLoading, error } = useQuery<{ events: EventDTO[] }, ApiError>({
    queryKey: ["calendar-events", gridStart.toISOString(), gridEnd.toISOString()],
    queryFn: () =>
      apiFetch<{ events: EventDTO[] }>(
        `/api/calendar/events?start=${encodeURIComponent(gridStart.toISOString())}&end=${encodeURIComponent(gridEnd.toISOString())}`,
      ),
  });

  const days = useMemo(() => {
    const list: Date[] = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [gridStart, gridEnd]);

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

  if (isLoading) return <p className="text-sm text-neutral-400">Loading month…</p>;
  if (error) return <p className="text-sm text-amber-700 dark:text-amber-400">{error.message}</p>;

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, anchorDate);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-20 flex-col gap-1 rounded-md border p-1 text-left",
                inMonth
                  ? "border-neutral-200 dark:border-neutral-800"
                  : "border-transparent bg-neutral-50/50 dark:bg-neutral-900/40",
              )}
            >
              <span
                className={cn(
                  "self-start rounded-full px-1.5 text-xs",
                  today
                    ? "bg-indigo-600 font-semibold text-white"
                    : inMonth
                      ? "text-neutral-700 dark:text-neutral-300"
                      : "text-neutral-400 dark:text-neutral-600",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
                  <span
                    key={event.id}
                    title={event.title}
                    className="truncate rounded bg-indigo-50 px-1 py-0.5 text-[11px] text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                  >
                    {event.title}
                  </span>
                ))}
                {dayEvents.length > MAX_CHIPS_PER_DAY && (
                  <span className="px-1 text-[11px] text-neutral-400">
                    +{dayEvents.length - MAX_CHIPS_PER_DAY} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
