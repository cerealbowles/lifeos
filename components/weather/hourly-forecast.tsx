import { Cloud, Droplets } from "lucide-react";
import { CONDITION_ICON } from "@/components/weather/condition-icon";
import { formatInUserZone } from "@/lib/format";
import type { HourlyView } from "@/lib/weather/service";

export function HourlyForecastRow({
  hourly,
  timezone,
  unit,
}: {
  hourly: HourlyView[];
  timezone: string;
  unit: "F" | "C";
}) {
  if (hourly.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {hourly.map((hour) => {
        const Icon = CONDITION_ICON[hour.conditions] ?? Cloud;
        return (
          <div key={hour.time} className="flex shrink-0 flex-col items-center gap-1.5 text-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatInUserZone(hour.time, timezone, "h a")}
            </span>
            <Icon className="h-5 w-5 text-neutral-400" strokeWidth={1.75} />
            <span className="text-sm font-medium">
              {hour.temperature}°{unit}
            </span>
            {hour.precipitationChance >= 20 && (
              <span className="flex items-center gap-0.5 text-[11px] text-sky-600 dark:text-sky-400">
                <Droplets className="h-3 w-3" />
                {hour.precipitationChance}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
