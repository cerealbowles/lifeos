import "server-only";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { endOfDayInZone, formatInUserZone, startOfDayInZone } from "@/lib/format";
import { getFavoriteGames, listFavoriteTeams } from "@/lib/sports/service";
import { getWeatherOverview } from "@/lib/weather/service";
import { buildDailyRundown, type DailyRundown, type RundownInput } from "./rundown";
import type { User } from "@/lib/db/schema";

/** Fetches everything buildDailyRundown needs and assembles it into a DailyRundown. Its own
 *  independent Promise.all, not merged into getTodayOverview — same split as the existing
 *  /api/today + /api/weather pair, and the rundown's tone is live/time-sensitive in a way
 *  Today's cached payload isn't, so it shouldn't share a cache lifetime with it either. */
export async function getDailyRundown(user: User, now: Date = new Date()): Promise<DailyRundown> {
  const timezone = user.timezone;
  const dayStart = startOfDayInZone(now, timezone);
  const dayEnd = endOfDayInZone(now, timezone);
  const units = user.unitsSystem === "metric" ? "metric" : "imperial";
  const todayStr = formatInUserZone(now, timezone, "yyyy-MM-dd");

  const [activeRoutines, completedTodayRows, openTasks, weatherOverview, favoriteGames, favorites] = await Promise.all([
    db.select().from(schema.routines).where(and(eq(schema.routines.userId, user.id), eq(schema.routines.active, true))),
    db
      .select()
      .from(schema.routineEvents)
      .where(
        and(
          eq(schema.routineEvents.userId, user.id),
          eq(schema.routineEvents.eventType, "completed"),
          gte(schema.routineEvents.completedAt, dayStart),
          lte(schema.routineEvents.completedAt, dayEnd),
        ),
      ),
    db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.userId, user.id), inArray(schema.tasks.status, ["todo", "in_progress"]))),
    getWeatherOverview(user.id, units),
    // Same degrade-gracefully pattern as lib/today/service.ts — sports-betting being
    // unreachable/unconfigured shouldn't break the whole rundown, just omit game mentions.
    getFavoriteGames(user.id).catch(() => []),
    listFavoriteTeams(user.id),
  ]);

  const routinesDueToday = activeRoutines
    .filter((r) => r.nextDueAt && formatInUserZone(r.nextDueAt, timezone, "yyyy-MM-dd") === todayStr)
    .map((r) => ({ id: r.id, name: r.name }));

  const routinesCompletedToday = completedTodayRows
    .filter((e) => e.completedAt !== null)
    .map((e) => ({ routineId: e.routineId, completedAt: e.completedAt as Date }));

  const gamesToday = favoriteGames.filter(
    (g) => g.startAt !== null && new Date(g.startAt) >= dayStart && new Date(g.startAt) <= dayEnd,
  );

  const favoriteKeys = new Set(favorites.map((f) => `${f.sport}:${f.teamAbbr}`));

  const input: RundownInput = {
    now,
    timezone,
    firstName: user.displayName.trim().split(/\s+/)[0] || null,
    weather: weatherOverview?.current ?? null,
    hourly: weatherOverview?.hourly ?? [],
    tomorrow: weatherOverview?.daily?.[1] ?? null,
    routinesDueToday,
    routinesCompletedToday,
    openTaskCount: openTasks.length,
    gamesToday,
    favoriteKeys,
  };

  return buildDailyRundown(input);
}
