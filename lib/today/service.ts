import "server-only";

import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { listAccounts, listReminders } from "@/lib/finance/service";
import { listEvents as listCalendarEvents } from "@/lib/calendar/service";
import { getFavoriteGames } from "@/lib/sports/service";
import { listPets } from "@/lib/pets/service";
import { nextBirthday } from "@/lib/pets/birthday";
import { listPlants } from "@/lib/growing/service";
import { dayCount, nextCheckDue } from "@/lib/growing/day";
import { endOfDayInZone, formatInUserZone, joinWithAnd, plural } from "@/lib/format";
import { bucketCandidates, derivePulseState, type CandidateInput, type PulseState, type TodayBuckets } from "./ranking";
import type { User } from "@/lib/db/schema";

const LOOKAHEAD_DAYS = 14;

export type LatestMeasurement = { type: string; value: string; unit: string; measuredAt: string };

export type TodayOverview = TodayBuckets & {
  date: string;
  weather: null; // Milestone 3
  lists: Array<{ id: string; name: string; openItemCount: number }>;
  /**
   * One compressed sentence describing today ("Today: 2 events, 3 tasks, and 1 bill."), or
   * null when there's nothing notable. Deliberately a single sentence rather
   * than a strip of per-domain count badges — DECISIONS.md ADR-043 ("no unread counts as
   * the primary attention mechanic"): a row of "Tasks 3 / Events 2 / Bills 1" pills is
   * exactly the unread-badge-grid pattern that ADR calls out, even though each pill's label
   * was already a phrase rather than a bare number. One sentence still uses real counts
   * (they're useful for planning, which the ADR explicitly allows) but reads as a single
   * compressed thought instead of a scoreboard.
   */
  glanceSummary: string | null;
  latestMeasurement: LatestMeasurement | null;
  /** DECISIONS.md ADR-030/042/076 (Life Pulse) — one overall attention state for the page. */
  pulse: PulseState;
};

export async function getTodayOverview(user: User, now: Date = new Date()): Promise<TodayOverview> {
  const lookaheadEnd = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const glanceEnd = endOfDayInZone(now, user.timezone);

  const [
    openTasks,
    activeRoutines,
    userLists,
    upcomingPetEvents,
    allReminders,
    allAccounts,
    latestMeasurementRows,
    upcomingCalendarEvents,
    favoriteTeamGames,
    pets,
    activePlants,
  ] = await Promise.all([
    db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.userId, user.id), inArray(schema.tasks.status, ["todo", "in_progress"])))
      .orderBy(asc(schema.tasks.dueAt)),
    db
      .select()
      .from(schema.routines)
      .where(and(eq(schema.routines.userId, user.id), eq(schema.routines.active, true)))
      .orderBy(asc(schema.routines.nextDueAt)),
    db.select().from(schema.lists).where(and(eq(schema.lists.userId, user.id), eq(schema.lists.archived, false))),
    db
      .select({ event: schema.petEvents, petName: schema.pets.name })
      .from(schema.petEvents)
      .innerJoin(schema.pets, eq(schema.petEvents.petId, schema.pets.id))
      .where(and(eq(schema.petEvents.userId, user.id), lte(schema.petEvents.scheduledAt, lookaheadEnd))),
    listReminders(user.id, user.timezone, now),
    listAccounts(user.id, user.timezone, now),
    db
      .select()
      .from(schema.measurements)
      .where(eq(schema.measurements.userId, user.id))
      .orderBy(desc(schema.measurements.measuredAt))
      .limit(1),
    listCalendarEvents(user.id, { start: now, end: lookaheadEnd }, now),
    // DECISIONS.md ADR-099 — sports-betting's feed can be unreachable/unconfigured without
    // that being a Today-page-breaking error; every other favorite-team-game consumer here
    // already tolerates "no games," so this degrades the same way "no favorites yet" does.
    getFavoriteGames(user.id).catch(() => []),
    listPets(user.id),
    listPlants(user.id),
  ]);

  // Not-yet-started OR currently-live favorite-team games with a resolved start time within
  // the lookahead window — matches the old ESPN-based "scheduled" filter's intent, plus
  // DECISIONS.md ADR-107's live-game NOW exception (ranking.ts). `startAt` can be null
  // (sports-betting couldn't resolve a start time for that game); those are excluded from
  // Today rather than guessed at, same as "no due date" excludes a task from Today.
  const upcomingGames = favoriteTeamGames
    .filter((g) => (g.status === "Preview" || g.status === "Live") && g.startAt !== null)
    .map((g) => ({ ...g, startAt: g.startAt as string }))
    .filter((g) => new Date(g.startAt) <= lookaheadEnd);

  // DECISIONS.md (pet birthdays) — computed fresh from pets.birth_date every time, not
  // stored as a pet_events row, so there's nothing to keep in sync when birthDate changes.
  // Only active (non-retired) pets get surfaced here.
  const upcomingBirthdays = pets
    .filter((pet) => pet.birthDate !== null)
    .map((pet) => ({ pet, ...nextBirthday(pet.birthDate!, now) }))
    .filter((b) => b.date <= lookaheadEnd);

  const activePetEvents = upcomingPetEvents.filter((row) => !row.event.completedAt);
  const upcomingReminders = allReminders.filter((r) => r.nextDueAt <= lookaheadEnd);

  // DECISIONS.md ADR-094 — "day N" and "next check due" are both computed fresh from
  // date_planted/last_checked_at every time, never stored, same reasoning as pet birthdays.
  // A harvested plant generates no further check reminders.
  const todayDateStr = formatInUserZone(now, user.timezone, "yyyy-MM-dd");
  const plantsNeedingChecks = activePlants.filter((p) => p.stage !== "harvest");
  const upcomingStatementCloses = allAccounts.filter(
    (a) => a.nextStatementCloseAt && a.nextStatementCloseAt <= lookaheadEnd,
  );

  const candidates: CandidateInput[] = [
    ...openTasks.map(
      (t): CandidateInput => ({
        id: t.id,
        domain: "task",
        title: t.title,
        dueAt: t.dueAt,
        priority: t.priority,
      }),
    ),
    ...activeRoutines.map(
      (r): CandidateInput => ({
        id: r.id,
        domain: "routine",
        title: r.name,
        dueAt: r.nextDueAt,
      }),
    ),
    ...activePetEvents.map(
      (row): CandidateInput => ({
        id: row.event.id,
        domain: "pet",
        title: row.event.title,
        dueAt: row.event.scheduledAt,
        eventType: row.event.eventType,
        subtitle: row.petName,
        href: `/pets/${row.event.petId}`,
      }),
    ),
    ...upcomingReminders.map(
      (f): CandidateInput => ({
        id: f.id,
        domain: "financial",
        title: `${f.name} payment due`,
        dueAt: f.nextDueAt,
      }),
    ),
    ...upcomingStatementCloses.map(
      (a): CandidateInput => ({
        id: `${a.id}-statement-close`,
        domain: "financial",
        title: `${a.name} statement closes`,
        dueAt: a.nextStatementCloseAt,
      }),
    ),
    ...upcomingCalendarEvents
      .filter((e) => e.status !== "cancelled")
      .map(
        (e): CandidateInput => ({
          id: e.id,
          domain: "calendar",
          title: e.title,
          dueAt: e.startAt,
          subtitle: e.location ?? undefined,
        }),
      ),
    ...upcomingGames.map((g): CandidateInput => {
      const live = g.status === "Live";
      return {
        // No stable game id from the new source (sports-betting has no persisted game
        // table, see lib/sports/betting-client.ts) — this composite is stable enough for
        // one render pass (React key + NOW/TODAY bucketing), which is all it's used for.
        id: `${g.sport}-${g.awayTeam}-${g.homeTeam}-${g.startAt}`,
        domain: "sports",
        title: `${g.awayTeam} @ ${g.homeTeam}`,
        dueAt: new Date(g.startAt),
        // Live score/period beats the plain sport-name subtitle once there's something to
        // report — DECISIONS.md ADR-107.
        subtitle:
          live && g.awayScore !== null && g.homeScore !== null
            ? `${g.sport.toUpperCase()} · ${g.awayScore}-${g.homeScore}${g.period ? ` · ${g.period}` : ""}`
            : g.sport.toUpperCase(),
        live,
        game: g,
      };
    }),
    ...upcomingBirthdays.map(
      (b): CandidateInput => ({
        id: `${b.pet.id}-birthday-${b.date.getFullYear()}`,
        domain: "pet",
        title: `Birthday — turns ${b.age}`,
        dueAt: b.date,
        eventType: "birthday",
        subtitle: b.pet.name,
        href: `/pets/${b.pet.id}`,
      }),
    ),
    ...plantsNeedingChecks.map(
      (p): CandidateInput => ({
        id: p.id,
        domain: "grow",
        title: `Check ${p.strain} — day ${dayCount(p.datePlanted, todayDateStr)}`,
        dueAt: nextCheckDue(p.datePlanted, p.lastCheckedAt),
        href: `/grow/${p.id}`,
      }),
    ),
  ];

  const { now: nowItems, today, overflow } = bucketCandidates(candidates, now, user.timezone);
  const pulse = derivePulseState(nowItems, today);

  const openItemCounts = await getOpenListItemCounts(
    user.id,
    userLists.map((l) => l.id),
  );

  const lists = userLists
    .map((l) => ({ id: l.id, name: l.name, openItemCount: openItemCounts.get(l.id) ?? 0 }))
    .filter((l) => l.openItemCount > 0);

  const glanceSummary = buildGlanceSummary({
    openTaskCount: openTasks.length,
    routinesDueSoon: activeRoutines.filter((r) => r.nextDueAt && r.nextDueAt <= glanceEnd).length,
    petEventsSoon: activePetEvents.filter((row) => row.event.scheduledAt && row.event.scheduledAt <= glanceEnd)
      .length,
    billsDueSoon: upcomingReminders.filter((f) => f.nextDueAt <= glanceEnd).length,
    statementsClosingSoon: upcomingStatementCloses.filter(
      (a) => a.nextStatementCloseAt && a.nextStatementCloseAt <= glanceEnd,
    ).length,
    calendarEventsSoon: upcomingCalendarEvents.filter((e) => e.status !== "cancelled" && e.startAt <= glanceEnd)
      .length,
    gamesSoon: upcomingGames.filter((g) => new Date(g.startAt) <= glanceEnd).length,
    growChecksSoon: plantsNeedingChecks.filter(
      (p) => nextCheckDue(p.datePlanted, p.lastCheckedAt) <= glanceEnd,
    ).length,
  });

  const latest = latestMeasurementRows[0];
  const latestMeasurement: LatestMeasurement | null = latest
    ? { type: latest.type, value: latest.value, unit: latest.unit, measuredAt: latest.measuredAt.toISOString() }
    : null;

  return {
    date: now.toISOString(),
    weather: null,
    now: nowItems,
    today,
    overflow,
    lists,
    glanceSummary,
    latestMeasurement,
    pulse,
  };
}

async function getOpenListItemCounts(userId: string, listIds: string[]): Promise<Map<string, number>> {
  if (listIds.length === 0) return new Map();

  const rows = await db
    .select({ listId: schema.listItems.listId })
    .from(schema.listItems)
    .where(
      and(
        eq(schema.listItems.userId, userId),
        eq(schema.listItems.checked, false),
        inArray(schema.listItems.listId, listIds),
      ),
    );

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.listId, (counts.get(row.listId) ?? 0) + 1);
  }
  return counts;
}

function buildGlanceSummary(counts: {
  openTaskCount: number;
  routinesDueSoon: number;
  petEventsSoon: number;
  billsDueSoon: number;
  statementsClosingSoon: number;
  calendarEventsSoon: number;
  gamesSoon: number;
  growChecksSoon: number;
}): string | null {
  const parts: string[] = [];
  if (counts.calendarEventsSoon > 0) parts.push(`${counts.calendarEventsSoon} event${plural(counts.calendarEventsSoon)}`);
  if (counts.openTaskCount > 0) parts.push(`${counts.openTaskCount} task${plural(counts.openTaskCount)}`);
  if (counts.routinesDueSoon > 0) parts.push(`${counts.routinesDueSoon} routine${plural(counts.routinesDueSoon)}`);
  if (counts.petEventsSoon > 0) parts.push(`${counts.petEventsSoon} pet event${plural(counts.petEventsSoon)}`);
  if (counts.billsDueSoon > 0) parts.push(`${counts.billsDueSoon} bill${plural(counts.billsDueSoon)}`);
  if (counts.statementsClosingSoon > 0) {
    parts.push(`${counts.statementsClosingSoon} statement close${plural(counts.statementsClosingSoon)}`);
  }
  if (counts.gamesSoon > 0) parts.push(`${counts.gamesSoon} game${plural(counts.gamesSoon)}`);
  if (counts.growChecksSoon > 0) parts.push(`${counts.growChecksSoon} grow check${plural(counts.growChecksSoon)}`);

  if (parts.length === 0) return null;
  return `Today: ${joinWithAnd(parts)}.`;
}
