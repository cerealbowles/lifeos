import "server-only";

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

export async function listWorkouts(userId: string, limit = 20) {
  return db
    .select()
    .from(schema.workouts)
    .where(eq(schema.workouts.userId, userId))
    .orderBy(desc(schema.workouts.date), desc(schema.workouts.createdAt))
    .limit(limit);
}

/** For Challenges' outdoor-workout auto-check (ADR-094/095) — every workout in a date range. */
export async function listWorkoutsInRange(userId: string, startDate: string, endDate: string) {
  return db
    .select()
    .from(schema.workouts)
    .where(and(eq(schema.workouts.userId, userId), gte(schema.workouts.date, startDate), lte(schema.workouts.date, endDate)));
}

export async function createWorkout(
  userId: string,
  input: {
    date: string;
    time?: string;
    type: string;
    durationMinutes: number;
    outdoor?: boolean;
    note?: string;
    source?: string;
  },
) {
  const [workout] = await db
    .insert(schema.workouts)
    .values({
      userId,
      date: input.date,
      time: input.time ?? null,
      type: input.type,
      durationMinutes: input.durationMinutes,
      outdoor: input.outdoor ?? false,
      note: input.note,
      source: input.source ?? "manual",
    })
    .returning();

  await logActivity({
    userId,
    domain: "workouts",
    eventType: "workout.logged",
    entityType: "workout",
    entityId: workout.id,
    summary: `Logged ${workout.durationMinutes} min of ${workout.type}${workout.outdoor ? " (outdoor)" : ""}`,
  });

  return workout;
}

export async function deleteWorkout(userId: string, workoutId: string) {
  await db.delete(schema.workouts).where(and(eq(schema.workouts.id, workoutId), eq(schema.workouts.userId, userId)));
}
