"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { NowList } from "./now-list";
import { TodayGroups } from "./today-groups";
import { AtAGlance } from "./at-a-glance";
import { HealthCard } from "./health-card";
import { WeatherCard } from "./weather-card";
import { ChallengeCard, type ChallengeCardSummary } from "./challenge-card";
import { ListsStrip } from "./lists-strip";
import { EverythingShortcuts } from "./everything-shortcuts";
import type { TodayOverview } from "@/lib/today/service";
import type { WeatherView } from "@/lib/weather/service";

const TABS = ["Now", "Today", "Everything"] as const;
type Tab = (typeof TABS)[number];

export function MobileTodayTabs({
  overview,
  weather,
  challengeSummary,
  timezone,
}: {
  overview: TodayOverview;
  weather: WeatherView | null;
  challengeSummary: ChallengeCardSummary | null;
  timezone: string;
}) {
  const [tab, setTab] = useState<Tab>(overview.now.length > 0 ? "Now" : "Today");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Now" && <NowList items={overview.now} pulse={overview.pulse} />}

      {tab === "Today" && (
        <div className="flex flex-col gap-4">
          <WeatherCard weather={weather} />
          <TodayGroups
            groups={overview.today}
            overflow={overview.overflow}
            pulse={overview.pulse}
            timezone={timezone}
          />
          <AtAGlance summary={overview.glanceSummary} />
          <HealthCard measurement={overview.latestMeasurement} />
          <ChallengeCard summary={challengeSummary} />
          <ListsStrip lists={overview.lists} />
        </div>
      )}

      {tab === "Everything" && <EverythingShortcuts />}
    </div>
  );
}
