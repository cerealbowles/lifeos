import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { formatInUserZone } from "@/lib/format";
import { listWorkoutsInRange } from "@/lib/workouts/service";
import { dayNumber, challengeDateRange } from "./day";
import { isWorkoutHabit, requiresOutdoorWorkout } from "./workout-match";
import type { ChallengeStatus } from "@/lib/db/schema";

/**
 * DECISIONS.md ADR-095 — folds workout-derived completions into a manual completedSet in
 * place, for whichever habits match isWorkoutHabit. A habit needing an outdoor workout is
 * satisfied only by a workout logged with outdoor: true that day; a plain "workout" habit is
 * satisfied by any workout that day.
 */
function applyWorkoutAutoCheck(
  habits: { id: string; title: string }[],
  dates: string[],
  completedSet: Set<string>,
  workouts: { date: string; outdoor: boolean }[],
) {
  const workoutHabits = habits.filter((h) => isWorkoutHabit(h.title));
  if (workoutHabits.length === 0) return;

  const datesWithWorkout = new Set(workouts.map((w) => w.date));
  const datesWithOutdoorWorkout = new Set(workouts.filter((w) => w.outdoor).map((w) => w.date));

  for (const habit of workoutHabits) {
    const satisfiedDates = requiresOutdoorWorkout(habit.title) ? datesWithOutdoorWorkout : datesWithWorkout;
    for (const date of dates) {
      if (satisfiedDates.has(date)) completedSet.add(`${habit.id}:${date}`);
    }
  }
}

export async function listChallenges(userId: string) {
  return db
    .select()
    .from(schema.challenges)
    .where(eq(schema.challenges.userId, userId))
    .orderBy(desc(schema.challenges.startDate));
}

export async function getChallenge(userId: string, challengeId: string) {
  const [challenge] = await db
    .select()
    .from(schema.challenges)
    .where(and(eq(schema.challenges.id, challengeId), eq(schema.challenges.userId, userId)))
    .limit(1);
  return challenge ?? null;
}

export async function listHabits(userId: string, challengeId: string) {
  return db
    .select()
    .from(schema.challengeHabits)
    .where(and(eq(schema.challengeHabits.challengeId, challengeId), eq(schema.challengeHabits.userId, userId)))
    .orderBy(asc(schema.challengeHabits.position), asc(schema.challengeHabits.createdAt));
}

export async function createChallenge(
  userId: string,
  input: { name: string; startDate: string; durationDays: number; habitTitles: string[] },
) {
  return db.transaction(async (tx) => {
    const [challenge] = await tx
      .insert(schema.challenges)
      .values({
        userId,
        name: input.name,
        startDate: input.startDate,
        durationDays: input.durationDays,
      })
      .returning();

    const habits = input.habitTitles.length
      ? await tx
          .insert(schema.challengeHabits)
          .values(input.habitTitles.map((title, position) => ({ challengeId: challenge.id, userId, title, position })))
          .returning()
      : [];

    await logActivity({
      userId,
      domain: "challenges",
      eventType: "challenge.created",
      entityType: "challenge",
      entityId: challenge.id,
      summary: `Started "${challenge.name}" (${input.durationDays} days)`,
    });

    return { challenge, habits };
  });
}

export async function updateChallenge(
  userId: string,
  challengeId: string,
  input: Partial<{ name: string; status: ChallengeStatus }>,
) {
  const [challenge] = await db
    .update(schema.challenges)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(schema.challenges.id, challengeId), eq(schema.challenges.userId, userId)))
    .returning();
  return challenge ?? null;
}

/**
 * Hard delete, unlike pets/lists (DECISIONS.md ADR-081) — a challenge's completion history
 * has no value or reference outside that challenge itself, so there's no "accidentally
 * destroyed something with lasting significance" risk a soft delete would guard against.
 * Same reasoning as activity_sessions (ADR-087).
 */
export async function deleteChallenge(userId: string, challengeId: string) {
  await db.delete(schema.challenges).where(and(eq(schema.challenges.id, challengeId), eq(schema.challenges.userId, userId)));
}

export async function addHabit(userId: string, challengeId: string, title: string) {
  const existing = await listHabits(userId, challengeId);
  const [habit] = await db
    .insert(schema.challengeHabits)
    .values({ challengeId, userId, title, position: existing.length })
    .returning();
  return habit;
}

export async function removeHabit(userId: string, habitId: string) {
  await db.delete(schema.challengeHabits).where(and(eq(schema.challengeHabits.id, habitId), eq(schema.challengeHabits.userId, userId)));
}

/**
 * Toggle, not an accumulating log — checking an already-completed habit for today un-checks
 * it. Returns the new state so the caller doesn't need a second read.
 */
export async function toggleCompletion(
  userId: string,
  challengeId: string,
  habitId: string,
  date: string,
): Promise<{ completed: boolean }> {
  const [existing] = await db
    .select({ id: schema.challengeCompletions.id })
    .from(schema.challengeCompletions)
    .where(and(eq(schema.challengeCompletions.habitId, habitId), eq(schema.challengeCompletions.date, date)))
    .limit(1);

  if (existing) {
    await db.delete(schema.challengeCompletions).where(eq(schema.challengeCompletions.id, existing.id));
    return { completed: false };
  }

  await db.insert(schema.challengeCompletions).values({ challengeId, habitId, userId, date });
  return { completed: true };
}

/**
 * Everything the /challenges/[id] detail page needs in one call: the challenge, its habits,
 * which day of the program `now` falls on, and the full completion history as a
 * `"habitId:date"` lookup set (cheap O(1) membership check for the progress grid, rather than
 * the page re-scanning an array per cell).
 */
export async function getChallengeDetail(userId: string, challengeId: string, now: Date, timezone: string) {
  const challenge = await getChallenge(userId, challengeId);
  if (!challenge) return null;

  const habits = await listHabits(userId, challengeId);
  const todayDate = formatInUserZone(now, timezone, "yyyy-MM-dd");
  const dates = challengeDateRange(challenge.startDate, challenge.durationDays, todayDate);

  const habitIds = habits.map((h) => h.id);
  const completions = habitIds.length
    ? await db
        .select({ habitId: schema.challengeCompletions.habitId, date: schema.challengeCompletions.date })
        .from(schema.challengeCompletions)
        .where(inArray(schema.challengeCompletions.habitId, habitIds))
    : [];

  const completedSet = new Set(completions.map((c) => `${c.habitId}:${c.date}`));

  if (dates.length > 0) {
    const workouts = await listWorkoutsInRange(userId, dates[0], dates[dates.length - 1]);
    applyWorkoutAutoCheck(habits, dates, completedSet, workouts);
  }

  return {
    challenge,
    habits: habits.map((h) => ({ ...h, autoCheck: isWorkoutHabit(h.title) })),
    dates,
    completedSet,
    day: dayNumber(challenge.startDate, todayDate),
    todayDate,
  };
}

/**
 * The compact shape the Today page's ChallengeCard needs — day count, today's habits, and
 * which are still outstanding. Deliberately doesn't fetch full history (getChallengeDetail
 * does that, for the actual /challenges/[id] page) — the Today card only cares about today.
 * Returns the single most-recently-started "active" challenge, or null if there isn't one —
 * only ever surfacing one at a time on Today keeps this from becoming its own wall of cards
 * if someone has several challenges going.
 */
export async function getActiveChallengeSummary(userId: string, now: Date, timezone: string) {
  const [challenge] = await db
    .select()
    .from(schema.challenges)
    .where(and(eq(schema.challenges.userId, userId), eq(schema.challenges.status, "active")))
    .orderBy(desc(schema.challenges.startDate))
    .limit(1);
  if (!challenge) return null;

  const habits = await listHabits(userId, challenge.id);
  const todayDate = formatInUserZone(now, timezone, "yyyy-MM-dd");

  const habitIds = habits.map((h) => h.id);
  const todaysCompletions = habitIds.length
    ? await db
        .select({ habitId: schema.challengeCompletions.habitId })
        .from(schema.challengeCompletions)
        .where(and(inArray(schema.challengeCompletions.habitId, habitIds), eq(schema.challengeCompletions.date, todayDate)))
    : [];
  const completedSet = new Set(todaysCompletions.map((c) => `${c.habitId}:${todayDate}`));

  const todaysWorkouts = await listWorkoutsInRange(userId, todayDate, todayDate);
  applyWorkoutAutoCheck(habits, [todayDate], completedSet, todaysWorkouts);

  const completedToday = new Set(habits.filter((h) => completedSet.has(`${h.id}:${todayDate}`)).map((h) => h.id));

  return {
    challenge,
    day: dayNumber(challenge.startDate, todayDate),
    todayDate,
    habits: habits.map((h) => ({
      id: h.id,
      title: h.title,
      completedToday: completedToday.has(h.id),
      autoCheck: isWorkoutHabit(h.title),
    })),
    doneCount: completedToday.size,
    totalCount: habits.length,
  };
}
