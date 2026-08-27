import "server-only";

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

export type WhoopReadingInput = {
  type: string;
  value: number;
  unit: string;
  measuredAt: Date;
  metadata?: Record<string, unknown>;
};

export type LatestWhoopReadings = Record<string, { value: string; unit: string; measuredAt: string }>;

/**
 * mobile/whoop-bridge syncs in bulk (a full historical offload after a pairing gap can be
 * hundreds of records) — insert as one batch, one logActivity summary for the whole batch
 * rather than one per reading, so an offload doesn't flood the activity log.
 */
export async function addWhoopReadings(userId: string, readings: WhoopReadingInput[]) {
  if (readings.length === 0) return [];

  const inserted = await db
    .insert(schema.measurements)
    .values(
      readings.map((r) => ({
        userId,
        type: r.type,
        value: r.value.toString(),
        unit: r.unit,
        measuredAt: r.measuredAt,
        source: "whoop",
        metadata: r.metadata ?? null,
      })),
    )
    .returning();

  const types = [...new Set(readings.map((r) => r.type))];
  await logActivity({
    userId,
    domain: "whoop",
    eventType: "whoop.readings_synced",
    entityType: "measurement",
    summary: `Synced ${readings.length} Whoop reading${readings.length === 1 ? "" : "s"} (${types.join(", ")})`,
  });

  return inserted;
}

const WHOOP_CARD_TYPES = ["recovery_score", "strain", "hrv", "heart_rate", "spo2", "skin_temp", "sleep_performance"];

/**
 * The strap (mobile/lifeos-android's Derive.kt) always reports skin_temp in Celsius — the
 * sensor's own native scale. Converted here, at the read boundary, not at write time: the
 * stored measurement stays exactly what the hardware reported (CLAUDE.md's "database is the
 * source of truth"), and every UI that reads through these two functions already renders
 * whatever `unit` string comes back, so returning "F" here is enough to flip the display
 * everywhere without touching whoop-card.tsx / skin-temp-baseline-card.tsx / their Android
 * ports.
 */
function celsiusToFahrenheit(celsius: number): number {
  return celsius * (9 / 5) + 32;
}

/** A *delta* between two Celsius readings converts without the +32 offset an absolute value needs. */
function celsiusDeltaToFahrenheit(deltaCelsius: number): number {
  return deltaCelsius * (9 / 5);
}

/** Latest reading per type, sourced only from Whoop — for the /health WhoopCard. */
export async function getLatestWhoopReadings(userId: string): Promise<LatestWhoopReadings> {
  const rows = await db
    .select()
    .from(schema.measurements)
    .where(
      and(
        eq(schema.measurements.userId, userId),
        eq(schema.measurements.source, "whoop"),
        inArray(schema.measurements.type, WHOOP_CARD_TYPES),
      ),
    )
    .orderBy(desc(schema.measurements.measuredAt));

  const latest: LatestWhoopReadings = {};
  for (const row of rows) {
    if (!latest[row.type]) {
      if (row.type === "skin_temp") {
        const fahrenheit = celsiusToFahrenheit(Number.parseFloat(row.value));
        latest[row.type] = { value: fahrenheit.toString(), unit: "F", measuredAt: row.measuredAt.toISOString() };
      } else {
        latest[row.type] = { value: row.value, unit: row.unit, measuredAt: row.measuredAt.toISOString() };
      }
    }
  }
  return latest;
}

export type SkinTempBaselineStatus = "very_low" | "low" | "normal" | "elevated" | "high";

export type SkinTempBaseline = {
  latest: { value: number; unit: string; measuredAt: string } | null;
  /** Trailing-window median skin temp, or null if there isn't enough history yet. */
  baseline: number | null;
  baselineSampleCount: number;
  deviation: number | null; // latest - baseline, same unit as latest
  status: SkinTempBaselineStatus | null;
};

const BASELINE_WINDOW_DAYS = 14;
// Excludes the most recent day from the baseline window itself — otherwise a genuinely
// abnormal reading would pull its own baseline toward itself and mute the deviation it's
// supposed to surface.
const BASELINE_EXCLUDE_RECENT_DAYS = 1;
const MIN_BASELINE_SAMPLES = 3;
// A starting heuristic (roughly what WHOOP/Oura-style skin-temp deviation alerts use as a
// rough public reference point), not a medical claim — documented here so it's easy to
// revisit once there's enough real history to tune against actual illness/recovery events.
const STATUS_THRESHOLD_ELEVATED_C = 0.3;
const STATUS_THRESHOLD_EXTREME_C = 1.0;

/**
 * Compares the latest skin_temp reading against a personal rolling baseline — computed
 * lazily on read (a plain aggregate over already-stored measurements), no caching table or
 * background job, same "lazily recomputes... rather than requiring a background job"
 * precedent as lib/finance/service.ts's stale-date handling. Restricting the baseline
 * window to sleep-only readings (closer to how WHOOP/Oura actually do it) is a natural
 * fast-follow once sleep_sessions has enough real nights in it to correlate against —
 * out of scope here to avoid a hard dependency between the two features.
 */
export async function getSkinTempBaseline(userId: string, now: Date = new Date()): Promise<SkinTempBaseline> {
  const [latestRow] = await db
    .select()
    .from(schema.measurements)
    .where(
      and(
        eq(schema.measurements.userId, userId),
        eq(schema.measurements.source, "whoop"),
        eq(schema.measurements.type, "skin_temp"),
      ),
    )
    .orderBy(desc(schema.measurements.measuredAt))
    .limit(1);

  if (!latestRow) {
    return { latest: null, baseline: null, baselineSampleCount: 0, deviation: null, status: null };
  }
  // Celsius throughout for the actual math below — STATUS_THRESHOLD_*_C is calibrated in
  // Celsius, and a rolling median/deviation computed on already-converted floats would just
  // reintroduce rounding drift for no reason. Only the returned `latest`/`baseline`/`deviation`
  // get converted, right before going back to the caller — see celsiusToFahrenheit's doc.
  const latestValue = Number.parseFloat(latestRow.value);
  const latestF = { value: celsiusToFahrenheit(latestValue), unit: "F", measuredAt: latestRow.measuredAt.toISOString() };

  const windowEnd = new Date(now.getTime() - BASELINE_EXCLUDE_RECENT_DAYS * 24 * 60 * 60 * 1000);
  const windowStart = new Date(windowEnd.getTime() - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const baselineRows = await db
    .select({ value: schema.measurements.value })
    .from(schema.measurements)
    .where(
      and(
        eq(schema.measurements.userId, userId),
        eq(schema.measurements.source, "whoop"),
        eq(schema.measurements.type, "skin_temp"),
        gte(schema.measurements.measuredAt, windowStart),
        lte(schema.measurements.measuredAt, windowEnd),
      ),
    );
  const baselineValues = baselineRows.map((r) => Number.parseFloat(r.value)).sort((a, b) => a - b);

  if (baselineValues.length < MIN_BASELINE_SAMPLES) {
    // Not enough history to trust a baseline yet — report that honestly rather than compute
    // one from almost nothing (same "skip rather than report an unreliable number" instinct
    // as the HRV Malik-filter fix's MIN_VALID_PAIRS gate).
    return { latest: latestF, baseline: null, baselineSampleCount: baselineValues.length, deviation: null, status: null };
  }

  const mid = Math.floor(baselineValues.length / 2);
  const baseline =
    baselineValues.length % 2 === 0 ? (baselineValues[mid - 1] + baselineValues[mid]) / 2 : baselineValues[mid];
  const deviation = Math.round((latestValue - baseline) * 100) / 100;

  let status: SkinTempBaselineStatus;
  if (deviation >= STATUS_THRESHOLD_EXTREME_C) status = "high";
  else if (deviation >= STATUS_THRESHOLD_ELEVATED_C) status = "elevated";
  else if (deviation <= -STATUS_THRESHOLD_EXTREME_C) status = "very_low";
  else if (deviation <= -STATUS_THRESHOLD_ELEVATED_C) status = "low";
  else status = "normal";

  return {
    latest: latestF,
    baseline: Math.round(celsiusToFahrenheit(baseline) * 100) / 100,
    baselineSampleCount: baselineValues.length,
    deviation: Math.round(celsiusDeltaToFahrenheit(deviation) * 100) / 100,
    status,
  };
}
