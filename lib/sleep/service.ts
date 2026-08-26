import "server-only";

import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { rangeStartDate, type MeasurementRange } from "@/lib/measurements/range";
import type { SleepStage } from "@/lib/db/schema";

/** A single stage run as uploaded by the phone — already consolidated from raw 1Hz samples. */
export type SleepSegmentInput = { stage: SleepStage; startedAt: Date; endedAt: Date };

/**
 * A sync batch's segments can span the tail of one session and the start of the next (a
 * night that crossed a sync boundary), so this is a single-pass fold, not a per-segment
 * upsert — cheaper and avoids re-deciding session membership out of order.
 */
const SESSION_GAP_MS = 60 * 60 * 1000; // 60 min — see plan's "gap threshold" reasoning

/**
 * Groups uploaded segments into sessions server-side (not on the phone) — the phone can
 * only see its own sync batch, but the server can see the user's full history, which is
 * what's needed to decide "is this a continuation of last night, or a new session" when a
 * night's data arrives across multiple syncs (seen live during the 20-day backlog drain).
 * A segment starting within SESSION_GAP_MS of the user's most recent segment extends that
 * session; otherwise it starts a new one. Segments within one input batch are treated the
 * same way, in order, so this also handles "insert segments for a whole never-before-seen
 * night in one call" correctly.
 */
export async function recordSleepSegments(userId: string, segments: SleepSegmentInput[]) {
  if (segments.length === 0) return;
  const ordered = [...segments].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  const [mostRecentSession] = await db
    .select()
    .from(schema.sleepSessions)
    .where(eq(schema.sleepSessions.userId, userId))
    .orderBy(desc(schema.sleepSessions.startedAt))
    .limit(1);

  // Tracked locally through the loop (not re-queried per segment) — duration is always
  // computed from these two timestamps, never carried forward as a running total, same
  // "single source of truth" discipline as activity_sessions' durationSeconds (ADR-087).
  let currentSessionId = mostRecentSession?.id ?? null;
  let currentSessionStartedAt = mostRecentSession?.startedAt ?? null;
  let currentSessionEndedAt = mostRecentSession?.endedAt ?? null;

  for (const segment of ordered) {
    const continuesCurrent =
      currentSessionId !== null &&
      currentSessionEndedAt !== null &&
      segment.startedAt.getTime() - currentSessionEndedAt.getTime() <= SESSION_GAP_MS;

    if (!continuesCurrent) {
      const [session] = await db
        .insert(schema.sleepSessions)
        .values({ userId, startedAt: segment.startedAt, endedAt: segment.endedAt })
        .returning();
      currentSessionId = session.id;
      currentSessionStartedAt = segment.startedAt;
    }

    await db.insert(schema.sleepStageSegments).values({
      sleepSessionId: currentSessionId!,
      userId,
      stage: segment.stage,
      startedAt: segment.startedAt,
      endedAt: segment.endedAt,
      durationSeconds: Math.max(0, Math.round((segment.endedAt.getTime() - segment.startedAt.getTime()) / 1000)),
    });

    currentSessionEndedAt = segment.endedAt;
    const durationSeconds = Math.max(0, Math.round((currentSessionEndedAt.getTime() - currentSessionStartedAt!.getTime()) / 1000));
    await db
      .update(schema.sleepSessions)
      .set({ endedAt: currentSessionEndedAt, durationSeconds, updatedAt: new Date() })
      .where(eq(schema.sleepSessions.id, currentSessionId!));
  }
}

export async function listSleepSessions(userId: string, range: MeasurementRange = "90d", now: Date = new Date()) {
  const since = rangeStartDate(range, now);
  const sessions = await db
    .select()
    .from(schema.sleepSessions)
    .where(since ? and(eq(schema.sleepSessions.userId, userId), gte(schema.sleepSessions.startedAt, since)) : eq(schema.sleepSessions.userId, userId))
    .orderBy(desc(schema.sleepSessions.startedAt));
  return sessions;
}

export async function getSleepSessionDetail(userId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(schema.sleepSessions)
    .where(and(eq(schema.sleepSessions.id, sessionId), eq(schema.sleepSessions.userId, userId)))
    .limit(1);
  if (!session) return null;

  const segments = await db
    .select()
    .from(schema.sleepStageSegments)
    .where(eq(schema.sleepStageSegments.sleepSessionId, sessionId))
    .orderBy(asc(schema.sleepStageSegments.startedAt));

  return { session, segments };
}
