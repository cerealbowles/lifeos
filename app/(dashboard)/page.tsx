import { requireUser } from "@/lib/auth/guards";
import { getTodayOverview } from "@/lib/today/service";
import { getCurrentWeather } from "@/lib/weather/service";
import { getActiveChallengeSummary } from "@/lib/challenges/service";
import { formatInUserZone, greeting } from "@/lib/format";
import { NowList } from "@/components/dashboard/now-list";
import { TodayGroups } from "@/components/dashboard/today-groups";
import { AtAGlance } from "@/components/dashboard/at-a-glance";
import { HealthCard } from "@/components/dashboard/health-card";
import { WeatherCard } from "@/components/dashboard/weather-card";
import { ChallengeCard } from "@/components/dashboard/challenge-card";
import { AmbientWeather } from "@/components/dashboard/ambient-weather";
import { ListsStrip } from "@/components/dashboard/lists-strip";
import { MobileTodayTabs } from "@/components/dashboard/mobile-today-tabs";
import { LifePulse } from "@/components/dashboard/life-pulse";
import { WeekStrip } from "@/components/dashboard/week-strip";

export default async function TodayPage() {
  const user = await requireUser();
  const now = new Date();
  const units = user.unitsSystem === "imperial" ? "imperial" : "metric";
  const [overview, weather, challengeSummary] = await Promise.all([
    getTodayOverview(user, now),
    getCurrentWeather(user.id, units),
    getActiveChallengeSummary(user.id, now, user.timezone),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Ambient weather backdrop (DECISIONS.md ADR-084, motion updated by ADR-104) — reads
          the day's weather through color/shape, with rain/snow now animated as a scoped,
          reduced-motion-aware exception to the no-continuous-animation rule; clouds stays
          static. Nothing renders for clear skies or an unconnected weather source. */}
      <div className="relative flex min-h-28 items-center overflow-hidden rounded-2xl">
        <AmbientWeather conditions={weather?.conditions} />
        <div className="relative z-10">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {greeting(now, user.timezone)}, {user.displayName.split(" ")[0]}
          </p>
          {/* DECISIONS.md ADR-109 (landscape direction) — editorial serif for the one display
              heading on this page; everything else (labels, data, nav) stays on --font-sans. */}
          <h1 className="font-serif text-2xl font-semibold">
            {formatInUserZone(now, user.timezone, "EEEE, MMMM d")}
          </h1>
        </div>
      </div>

      <WeekStrip now={now} timezone={user.timezone} />

      {/*
        Life Pulse (DECISIONS.md ADR-030/042/076) — one overall attention-state readout,
        shared between mobile and desktop rather than duplicated per layout. Replaces the old
        page-level "nothing to see" banner with something more deliberate: a single state
        (calm/active/attention/urgent) derived from the same NOW/TODAY data everything else
        uses, not a separate judgment call. NowList/TodayGroups below suppress their own calm
        messaging when pulse is "calm" so this doesn't get repeated three times.
      */}
      <LifePulse pulse={overview.pulse} now={overview.now} today={overview.today} />

      {/* Mobile: Now / Today / Everything — the phone prioritizes. */}
      <div className="md:hidden">
        <MobileTodayTabs
          overview={overview}
          weather={weather}
          challengeSummary={challengeSummary}
          timezone={user.timezone}
        />
      </div>

      {/* Desktop: everything relevant, organized — the desktop organizes. */}
      <div className="hidden flex-col gap-6 md:flex">
        <NowList items={overview.now} pulse={overview.pulse} />
        <TodayGroups
          groups={overview.today}
          overflow={overview.overflow}
          pulse={overview.pulse}
          timezone={user.timezone}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WeatherCard weather={weather} />
          <AtAGlance summary={overview.glanceSummary} />
          <HealthCard measurement={overview.latestMeasurement} />
          <ChallengeCard summary={challengeSummary} />
        </div>
        <ListsStrip lists={overview.lists} />
      </div>
    </div>
  );
}
