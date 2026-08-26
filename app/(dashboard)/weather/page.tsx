import Link from "next/link";
import { Cloud, Droplets, Wind, Thermometer } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getWeatherOverview } from "@/lib/weather/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONDITION_ICON } from "@/components/weather/condition-icon";
import { HourlyForecastRow } from "@/components/weather/hourly-forecast";
import { DailyForecastList } from "@/components/weather/daily-forecast";

// One Call 4.0's hourly timeline returns up to 20 records per request (no pagination follow-up
// yet) — real hourly resolution, just capped below a full 24h. Render whatever comes back
// rather than padding to a fixed 24.
const HOURS_TO_SHOW = 20;

export default async function WeatherPage() {
  const user = await requireUser();
  const units = user.unitsSystem === "imperial" ? "imperial" : "metric";
  const overview = await getWeatherOverview(user.id, units);

  if (!overview) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Weather</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Weather isn&apos;t connected yet — add an OpenWeatherMap API key and postal code from Settings.
            </p>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Go to Settings
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { current, hourly, daily } = overview;
  const Icon = CONDITION_ICON[current.conditions] ?? Cloud;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Weather — {current.locationName}</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
              <Icon className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-3xl font-semibold">
                {current.temperature}°{current.unit}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {current.conditions} · Feels like {current.feelsLike}°{current.unit} · H{current.highToday}°
                L{current.lowToday}°
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 border-t border-neutral-100 pt-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-neutral-400" />
              {current.precipitationChance}% chance
              {current.precipitationAmount > 0
                ? ` · ${current.precipitationAmount}${units === "imperial" ? '"' : "cm"}`
                : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-neutral-400" />
              {current.windSpeed} {units === "imperial" ? "mph" : "m/s"}
            </span>
            <span className="flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-neutral-400" />
              {current.humidity}% humidity
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hourly</CardTitle>
        </CardHeader>
        <CardContent>
          <HourlyForecastRow hourly={hourly.slice(0, HOURS_TO_SHOW)} timezone={user.timezone} unit={current.unit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7-day outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyForecastList daily={daily} timezone={user.timezone} unit={current.unit} />
        </CardContent>
      </Card>
    </div>
  );
}
