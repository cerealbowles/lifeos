import { Cloud, Droplets } from "lucide-react";
import { CONDITION_ICON } from "@/components/weather/condition-icon";
import { formatInUserZone } from "@/lib/format";
import type { DailyView } from "@/lib/weather/service";

function dayLabel(date: string, timezone: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return formatInUserZone(date, timezone, "EEEE");
}

export function DailyForecastList({
  daily,
  timezone,
  unit,
}: {
  daily: DailyView[];
  timezone: string;
  unit: "F" | "C";
}) {
  if (daily.length === 0) return null;

  return (
    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      {daily.map((day, index) => {
        const Icon = CONDITION_ICON[day.conditions] ?? Cloud;
        return (
          <li key={day.date} className="flex items-center gap-3 py-2.5">
            <span className="w-24 shrink-0 text-sm">{dayLabel(day.date, timezone, index)}</span>
            <Icon className="h-5 w-5 shrink-0 text-neutral-400" strokeWidth={1.75} />
            <span className="flex w-14 shrink-0 items-center gap-0.5 text-xs text-sky-600 dark:text-sky-400">
              {day.precipitationChance >= 20 && (
                <>
                  <Droplets className="h-3 w-3" />
                  {day.precipitationChance}%
                </>
              )}
            </span>
            <span className="ml-auto text-sm">
              <span className="text-neutral-400">{day.low}°</span>
              <span className="mx-1 text-neutral-300 dark:text-neutral-600">–</span>
              <span className="font-medium">
                {day.high}°{unit}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
