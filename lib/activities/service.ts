import "server-only";

import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import type { ActivityType } from "@/lib/db/schema";

export async function getActiveSession(userId: string) {
  const [session] = await db
    .select()
    .from(schema.activitySessions)
    .where(and(eq(schema.activitySessions.userId, userId), isNull(schema.activitySessions.endedAt)))
    .orderBy(desc(schema.activitySessions.startedAt))
    .limit(1);
  return session ?? null;
}

export async function getSession(userId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(schema.activitySessions)
    .where(and(eq(schema.activitySessions.id, sessionId), eq(schema.activitySessions.userId, userId)))
    .limit(1);
  return session ?? null;
}

export async function startSession(userId: string, activityType: ActivityType) {
  const [session] = await db
    .insert(schema.activitySessions)
    .values({ userId, activityType, startedAt: new Date() })
    .returning();
  return session;
}

/**
 * Entry point for the "Activity" nav icon and the Health page's start button — resumes
 * whatever's already running (e.g. the icon got tapped twice, or the ambient timer page was
 * closed and reopened) rather than starting a second concurrent session for the same user.
 */
export async function getOrStartActiveSession(userId: string, activityType: ActivityType) {
  const active = await getActiveSession(userId);
  if (active) return active;
  return startSession(userId, activityType);
}

export async function completeSession(userId: string, sessionId: string, now: Date = new Date()) {
  const session = await getSession(userId, sessionId);
  if (!session || session.endedAt) return null;

  const durationSeconds = Math.max(0, Math.round((now.getTime() - session.startedAt.getTime()) / 1000));
  const [updated] = await db
    .update(schema.activitySessions)
    .set({ endedAt: now, durationSeconds, updatedAt: now })
    .where(eq(schema.activitySessions.id, sessionId))
    .returning();

  await logActivity({
    userId,
    domain: "activities",
    eventType: "activity_session.completed",
    entityType: "activity_session",
    entityId: sessionId,
    summary: `Logged ${Math.round(durationSeconds / 60)} min of ${session.activityType}`,
  });

  return updated;
}

/**
 * Deletes a session regardless of state — the ambient timer's "Cancel" (an abandoned,
 * never-completed session) and the Health page's log delete button (a completed entry the
 * user wants to remove, e.g. logged by mistake) are the same operation from the DB's
 * perspective. Unlike pets/lists, there's no soft-delete-to-preserve-history concern here
 * (DECISIONS.md ADR-081) — a deleted activity log entry isn't referenced anywhere else, so a
 * real (hard) delete is correct, not a footgun.
 */
export async function deleteSession(userId: string, sessionId: string) {
  await db
    .delete(schema.activitySessions)
    .where(and(eq(schema.activitySessions.id, sessionId), eq(schema.activitySessions.userId, userId)));
}

export async function listRecentSessions(userId: string, limit = 20) {
  return db
    .select()
    .from(schema.activitySessions)
    .where(and(eq(schema.activitySessions.userId, userId), isNotNull(schema.activitySessions.endedAt)))
    .orderBy(desc(schema.activitySessions.startedAt))
    .limit(limit);
}
