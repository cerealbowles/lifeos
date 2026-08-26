import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";

function getWeekDates(now: Date, timezone: string): Date[] {
  const isoWeekday = Number(formatInTimeZone(now, timezone, "i")); // 1 (Mon) .. 7 (Sun)
  const monday = addDays(now, 1 - isoWeekday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * DECISIONS.md ADR-118 (landscape direction, "Today Design Direction") — a Mon–Sun strip for
 * temporal orientation, today visually emphasized. Deliberately non-interactive: `getTodayOverview`
 * (lib/today/service.ts) is built entirely around "now," and wiring a real day switch would mean
 * generalizing the ranking pipeline to arbitrary dates — a separate, larger feature, not this
 * pass. This is a plain read of the calendar, not a link/button anywhere in it.
 */
export function WeekStrip({ now, timezone }: { now: Date; timezone: string }) {
  const days = getWeekDates(now, timezone);
  const todayStr = formatInTimeZone(now, timezone, "yyyy-MM-dd");

  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {days.map((day) => {
        const dayStr = formatInTimeZone(day, timezone, "yyyy-MM-dd");
        const isToday = dayStr === todayStr;
        return (
          <div key={dayStr} className="flex flex-col items-center gap-1.5 py-1">
            <span className="text-[10px] font-medium tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
              {formatInTimeZone(day, timezone, "EEE")}
            </span>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                isToday
                  ? "bg-neutral-900 font-semibold text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-600 dark:text-neutral-400",
              )}
            >
              {formatInTimeZone(day, timezone, "d")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
