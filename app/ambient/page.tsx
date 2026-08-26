import { requireUser } from "@/lib/auth/guards";
import { getTodayOverview } from "@/lib/today/service";
import { getCurrentWeather } from "@/lib/weather/service";
import { formatInUserZone } from "@/lib/format";
import { PULSE_DOT_CLASS } from "@/components/dashboard/life-pulse";
import { LiveClock } from "@/components/ambient/live-clock";
import { AutoRefresh } from "@/components/ambient/auto-refresh";
import { cn } from "@/lib/utils";
import type { RankedItem } from "@/lib/today/ranking";

function formatUpcomingTime(dueAt: Date, timezone: string, now: Date): string {
  const sameDay = formatInUserZone(dueAt, timezone, "yyyy-MM-dd") === formatInUserZone(now, timezone, "yyyy-MM-dd");
  return sameDay ? formatInUserZone(dueAt, timezone, "h:mm a") : formatInUserZone(dueAt, timezone, "EEE h:mm a");
}

/**
 * DECISIONS.md ADR-057/058 (Ambient Display) — a third presentation surface for a spare
 * tablet/wall display, not a smaller phone. "Extremely low information density, large
 * typography... minimal interaction" per the source doc — this page shows the clock,
 * current weather, at most 2 upcoming items for peripheral context (regardless of pulse
 * state — that's just "what's the shape of the day," not an obligation), and one line for
 * whether anything actually needs attention. Everything else is deliberately omitted; this
 * is not a smaller Today page.
 */
export default async function AmbientPage() {
  const user = await requireUser();
  const now = new Date();
  const units = user.unitsSystem === "imperial" ? "imperial" : "metric";
  const [overview, weather] = await Promise.all([getTodayOverview(user, now), getCurrentWeather(user.id, units)]);

  const todayItems = Object.values(overview.today).flatMap((items) => items ?? []);
  const upcoming = [...overview.now, ...todayItems]
    .filter((item): item is RankedItem & { dueAt: Date } => item.dueAt !== null)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 2);

  const needsAttention = overview.pulse === "urgent" || overview.pulse === "attention";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-8 py-12 text-center">
      <AutoRefresh />

      <div className="text-7xl font-light tabular-nums sm:text-8xl">
        <LiveClock timezone={user.timezone} />
      </div>

      {weather && (
        <p className="text-2xl text-neutral-400 sm:text-3xl">
          {weather.temperature}°{weather.unit} · {weather.conditions}
        </p>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          {upcoming.map((item) => (
            <p key={`${item.domain}-${item.id}`} className="text-xl text-neutral-300 sm:text-2xl">
              {item.title} · {formatUpcomingTime(item.dueAt, user.timezone, now)}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col items-center gap-3">
        <span className={cn("h-3 w-3 rounded-full", PULSE_DOT_CLASS[overview.pulse])} aria-hidden="true" />
        {needsAttention ? (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-lg font-medium text-neutral-100 sm:text-xl">
              {overview.now.length} thing{overview.now.length === 1 ? " needs" : "s need"} attention
            </p>
            {overview.now.slice(0, 3).map((item) => (
              <p key={`${item.domain}-${item.id}`} className="text-base text-neutral-400">
                {item.title}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-base text-neutral-500">Everything else is quiet.</p>
        )}
      </div>
    </div>
  );
}
