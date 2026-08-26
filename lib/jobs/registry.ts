import "server-only";

import { refreshAllDueWeatherLocations } from "@/lib/weather/service";
import { refreshAllDueCalendarAccounts } from "@/lib/calendar/service";
import { refreshAllDueFeedSubscriptions } from "@/lib/feed/service";
import { generateNotificationsForAllUsers } from "@/lib/notifications/job";

export type JobResult = { refreshed: number; failed: number };
export type Job = {
  name: string;
  /** Matches each domain's own SYNC_TTL_MS/CACHE_TTL_MS — no point checking for due work
   *  more often than rows can actually go stale. */
  intervalMs: number;
  run: (now: Date) => Promise<JobResult>;
};

/**
 * DECISIONS.md ADR-088. The whole point of this registry: every one of these functions
 * already existed as the "sync if stale" half of a lazy, per-user, on-page-load read path
 * (getCurrentWeather, listEvents, getFeedItems) — this doesn't reimplement any provider-fetch
 * or upsert logic, it just calls the same sync step proactively, across every user, on a
 * timer, instead of waiting for someone to load a page.
 *
 * No "sports" job here (DECISIONS.md ADR-099 removed the old ESPN-based one) — sports games
 * are no longer synced/cached in LifeOS's own database at all; every read hits sports-betting
 * live (lib/sports/betting-client.ts), which already runs its own short-TTL cache. There's
 * nothing here for a proactive job to keep warm.
 */
export const JOBS: Job[] = [
  { name: "weather", intervalMs: 30 * 60 * 1000, run: refreshAllDueWeatherLocations },
  { name: "calendar", intervalMs: 15 * 60 * 1000, run: refreshAllDueCalendarAccounts },
  { name: "feed", intervalMs: 30 * 60 * 1000, run: refreshAllDueFeedSubscriptions },
  // Notifications (ROADMAP.md, docs/CALM_COMPUTING_DECISIONS.md Notification Philosophy) —
  // runs more often than the sync jobs above since it's not fetching anything external, just
  // re-deriving NOW from data already in Postgres and diffing against recent notifications.
  { name: "notifications", intervalMs: 10 * 60 * 1000, run: generateNotificationsForAllUsers },
];
