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
 * Hard ceiling on a single session's total span, independent of the gap rule above. Seen
 * live: a phone that lost its BLE link to the strap for ~54h (Doze/out-of-range/killed
 * background service) reconnected and drained the strap's on-board backlog in one derive
 * pass (mobile SleepDerive.kt's computeSegments has no duration cap of its own — see its
 * doc comment). If the strap reported one unchanging stage across the whole gap — plausible
 * if it sat off-wrist — the phone uploads that as a single ~54h segment, which is
 * contiguous-in-time and so would otherwise merge straight into a session and render as
 * "asleep for 54 hours." This cap is the last line of defense against that: no human sleep
 * session is plausibly this long, so once continuing the current session would push its
 * total span past this, force a new session to start instead, no matter how "contiguous"
 * the uploaded segment looks.
 */
const MAX_SESSION_DURATION_MS = 16 * 60 * 60 * 1000; // 16h — generous for a long illness/oversleep, well under any bogus multi-day merge

/**
 * Pure decision of whether `segment` extends the session currently open
 * (`currentSessionStartedAt`/`currentSessionEndedAt`, both null if there is no open
 * session) — split out from `recordSleepSegments` so the gap + duration-cap rules are
 * unit-testable without a database.
 */
export function continuesSession(
  segment: Pick<SleepSegmentInput, "startedAt" | "endedAt">,
  currentSessionStartedAt: Date | null,
  currentSessionEndedAt: Date | null,
): boolean {
  if (currentSessionStartedAt === null || currentSessionEndedAt === null) return false;
  const gapMs = segment.startedAt.getTime() - currentSessionEndedAt.getTime();
  if (gapMs > SESSION_GAP_MS) return false;
  const projectedDurationMs = segment.endedAt.getTime() - currentSessionStartedAt.getTime();
  return projectedDurationMs <= MAX_SESSION_DURATION_MS;
}

/**
 * Groups uploaded segments into sessions server-side (not on the phone) — the phone can
 * only see its own sync batch, but the server can see the user's full history, which is
 * what's needed to decide "is this a continuation of last night, or a new session" when a
 * night's data arrives across multiple syncs (seen live during the 20-day backlog drain).
 * A segment starting within SESSION_GAP_MS of the user's most recent segment extends that
 * session (unless doing so would exceed MAX_SESSION_DURATION_MS, see above); otherwise it
 * starts a new one. Segments within one input batch are treated the same way, in order, so
 * this also handles "insert segments for a whole never-before-seen night in one call"
 * correctly.
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
      currentSessionId !== null && continuesSession(segment, currentSessionStartedAt, currentSessionEndedAt);

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
