import { Cloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONDITION_ICON } from "@/components/weather/condition-icon";
import type { WeatherView } from "@/lib/weather/service";

export function WeatherCard({ weather }: { weather: WeatherView | null }) {
  if (!weather) return null;

  const Icon = CONDITION_ICON[weather.conditions] ?? Cloud;
  const rainLikely = weather.precipitationChance >= 50 || weather.precipitationAmount >= 0.25;

  return (
    <Card>
      <CardHeader>
        <CardTitle href="/weather">Weather — {weather.locationName}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold">
            {weather.temperature}°{weather.unit}
            <span className="ml-2 text-sm font-normal text-neutral-500 dark:text-neutral-400">
              {weather.conditions} · H{weather.highToday}° L{weather.lowToday}°
            </span>
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {weather.precipitationChance}% chance of rain
            {weather.precipitationAmount > 0 ? ` · ${weather.precipitationAmount}" expected` : ""}
          </p>
          {rainLikely && (
            <p className="mt-1 text-sm text-sky-700 dark:text-sky-400">
              Rain expected — outdoor watering probably isn&apos;t needed today.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
