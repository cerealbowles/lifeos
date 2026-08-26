import "server-only";

import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { rangeStartDate, type MeasurementRange } from "./range";

export type LatestMeasurement = { type: string; value: string; unit: string; measuredAt: string };

/**
 * Mirrors the inline query in lib/today/service.ts's getTodayOverview (kept separate rather
 * than refactored to share this, to avoid touching already-verified Today page code for a
 * five-line query) — the Health page needed its own standalone fetch since lib/measurements/
 * had no service layer at all before this.
 *
 * `type` defaults to "weight" — this is WeightCard's header stat, its only caller. Originally
 * had no type filter at all, which was harmless while "weight" was the only type anyone ever
 * wrote (DATA_MODEL.md: "type is plain text... only 'weight' has real UI today"). Once the
 * Whoop companion app started writing heart_rate/hrv into the same shared `measurements`
 * table, "most recent measurement of ANY type" started surfacing a heart-rate reading under
 * the Weight card — found live, not hypothetical (a real screenshot showed "81 bpm" labeled
 * as weight). Explicit type filter, not just a query-ordering fix.
 */
export async function getLatestMeasurement(userId: string, type: string = "weight"): Promise<LatestMeasurement | null> {
  const [latest] = await db
    .select()
    .from(schema.measurements)
    .where(and(eq(schema.measurements.userId, userId), eq(schema.measurements.type, type)))
    .orderBy(desc(schema.measurements.measuredAt))
    .limit(1);

  if (!latest) return null;
  return { type: latest.type, value: latest.value, unit: latest.unit, measuredAt: latest.measuredAt.toISOString() };
}

export async function addMeasurement(
  userId: string,
  input: { type: string; value: number; unit: string; measuredAt: Date },
) {
  const [measurement] = await db
    .insert(schema.measurements)
    .values({
      userId,
      type: input.type,
      value: input.value.toString(),
      unit: input.unit,
      measuredAt: input.measuredAt,
    })
    .returning();

  await logActivity({
    userId,
    domain: "measurements",
    eventType: "measurement.added",
    entityType: "measurement",
    entityId: measurement.id,
    summary: `Logged ${input.type}: ${input.value} ${input.unit}`,
  });

  return measurement;
}

/**
 * For the weight chart — every reading of one type within a range, oldest first (charts read
 * left-to-right chronologically, the opposite order from getLatestMeasurement's "most recent
 * first"). `range: "all"` skips the lower-bound filter entirely rather than passing some
 * arbitrarily-old fixed date.
 */
export async function listMeasurementsInRange(userId: string, type: string, range: MeasurementRange, now: Date = new Date()) {
  const since = rangeStartDate(range, now);
  const conditions = [eq(schema.measurements.userId, userId), eq(schema.measurements.type, type)];
  if (since) conditions.push(gte(schema.measurements.measuredAt, since));

  return db
    .select()
    .from(schema.measurements)
    .where(and(...conditions))
    .orderBy(asc(schema.measurements.measuredAt));
}

export async function deleteMeasurement(userId: string, id: string) {
  await db.delete(schema.measurements).where(and(eq(schema.measurements.id, id), eq(schema.measurements.userId, userId)));
}
