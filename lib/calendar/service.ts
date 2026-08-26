import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { ICloudCalDAVProvider } from "./provider";
import type { CalendarAccount, CalendarEventStatus } from "@/lib/db/schema";

// Matches spec §39's "sync calendar every few minutes". Enforced two ways now: lazily here
// (listEvents() re-syncs on read if stale — kept as the fallback so a page load is never
// blocked on the worker's cadence) and proactively by the background worker on this same
// interval (refreshAllDueCalendarAccounts below, DECISIONS.md ADR-088).
const SYNC_TTL_MS = 15 * 60 * 1000;
const SYNC_WINDOW_DAYS_PAST = 7;
const SYNC_WINDOW_DAYS_FUTURE = 60;

export async function connectCalendar(userId: string, username: string, appPassword: string) {
  const provider = new ICloudCalDAVProvider();
  const calendars = await provider.listCalendars(username, appPassword); // throws if credentials are bad

  const credentialEncrypted = encryptSecret(appPassword);

  await db.delete(schema.calendarAccounts).where(eq(schema.calendarAccounts.userId, userId));
  const [account] = await db
    .insert(schema.calendarAccounts)
    .values({
      userId,
      provider: "icloud",
      displayName: "iCloud",
      caldavUsername: username,
      credentialEncrypted,
    })
    .returning();

  return { account, calendarCount: calendars.length };
}

export async function getConnectionStatus(
  userId: string,
): Promise<{ connected: boolean; displayName: string | null; lastSyncedAt: string | null }> {
  const [account] = await db
    .select()
    .from(schema.calendarAccounts)
    .where(eq(schema.calendarAccounts.userId, userId))
    .limit(1);

  if (!account) return { connected: false, displayName: null, lastSyncedAt: null };
  return {
    connected: true,
    displayName: account.displayName,
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
  };
}

export async function disconnectCalendar(userId: string) {
  await db.delete(schema.calendarAccounts).where(eq(schema.calendarAccounts.userId, userId));
}

async function syncAccount(account: CalendarAccount, now: Date): Promise<void> {
  if (!account.caldavUsername || !account.credentialEncrypted) return;

  const provider = new ICloudCalDAVProvider();
  const password = decryptSecret(account.credentialEncrypted);
  const rangeStart = new Date(now.getTime() - SYNC_WINDOW_DAYS_PAST * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() + SYNC_WINDOW_DAYS_FUTURE * 24 * 60 * 60 * 1000);

  const events = await provider.listEvents(account.caldavUsername, password, {
    start: rangeStart,
    end: rangeEnd,
  });

  for (const event of events) {
    await db
      .insert(schema.calendarEvents)
      .values({
        userId: account.userId,
        calendarAccountId: account.id,
        externalId: event.externalId,
        title: event.title,
        description: event.description,
        location: event.location,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        status: event.status,
        source: "icloud",
      })
      .onConflictDoUpdate({
        target: [schema.calendarEvents.calendarAccountId, schema.calendarEvents.externalId],
        set: {
          title: event.title,
          description: event.description,
          location: event.location,
          startAt: event.startAt,
          endAt: event.endAt,
          allDay: event.allDay,
          status: event.status,
          updatedAt: now,
        },
      });
  }

  await db
    .update(schema.calendarAccounts)
    .set({ lastSyncedAt: now, updatedAt: now })
    .where(eq(schema.calendarAccounts.id, account.id));
}

/**
 * DECISIONS.md ADR-088 — the background worker's calendar job. Reuses syncAccount as-is;
 * the only thing this adds is iterating every enabled account across every user instead of
 * the single `.limit(1)` account listEvents() looks up for one specific user.
 */
export async function refreshAllDueCalendarAccounts(now: Date = new Date()): Promise<{ refreshed: number; failed: number }> {
  const accounts = await db.select().from(schema.calendarAccounts).where(eq(schema.calendarAccounts.syncEnabled, true));

  const due = accounts.filter((a) => !a.lastSyncedAt || now.getTime() - a.lastSyncedAt.getTime() > SYNC_TTL_MS);
  const results = await Promise.allSettled(due.map((account) => syncAccount(account, now)));

  return {
    refreshed: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

export async function listEvents(userId: string, range: { start: Date; end: Date }, now: Date = new Date()) {
  const [account] = await db
    .select()
    .from(schema.calendarAccounts)
    .where(eq(schema.calendarAccounts.userId, userId))
    .limit(1);

  const isStale = !account?.lastSyncedAt || now.getTime() - account.lastSyncedAt.getTime() > SYNC_TTL_MS;
  if (account?.syncEnabled && isStale) {
    await syncAccount(account, now);
  }

  return db
    .select()
    .from(schema.calendarEvents)
    .where(
      and(
        eq(schema.calendarEvents.userId, userId),
        gte(schema.calendarEvents.startAt, range.start),
        lte(schema.calendarEvents.startAt, range.end),
      ),
    )
    .orderBy(asc(schema.calendarEvents.startAt));
}

export async function createManualEvent(
  userId: string,
  input: {
    title: string;
    startAt: Date;
    endAt?: Date;
    allDay?: boolean;
    location?: string;
    description?: string;
  },
) {
  const [event] = await db
    .insert(schema.calendarEvents)
    .values({ userId, source: "manual", ...input })
    .returning();

  await logActivity({
    userId,
    domain: "calendar",
    eventType: "calendar_event.created",
    entityType: "calendar_event",
    entityId: event.id,
    summary: `Added "${event.title}" to calendar`,
  });

  return event;
}

/**
 * Manual events only — gated on `source === "manual"` (checked before the update, not just
 * relying on the WHERE clause) rather than allowing an edit to a CalDAV-synced event, which the
 * next sync would just silently overwrite. Returns `null` for a synced event, same as
 * not-found, so the route responds identically either way.
 */
export async function updateManualEvent(
  userId: string,
  eventId: string,
  input: Partial<{
    title: string;
    startAt: Date;
    endAt: Date | null;
    allDay: boolean;
    location: string | null;
    description: string | null;
  }>,
) {
  const [existing] = await db
    .select()
    .from(schema.calendarEvents)
    .where(and(eq(schema.calendarEvents.id, eventId), eq(schema.calendarEvents.userId, userId)))
    .limit(1);
  if (!existing || existing.source !== "manual") return null;

  const [event] = await db
    .update(schema.calendarEvents)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(schema.calendarEvents.id, eventId), eq(schema.calendarEvents.userId, userId)))
    .returning();
  if (!event) return null;

  await logActivity({
    userId,
    domain: "calendar",
    eventType: "calendar_event.updated",
    entityType: "calendar_event",
    entityId: event.id,
    summary: `Updated "${event.title}" on calendar`,
  });

  return event;
}

export async function deleteEvent(userId: string, eventId: string) {
  await db
    .delete(schema.calendarEvents)
    .where(and(eq(schema.calendarEvents.id, eventId), eq(schema.calendarEvents.userId, userId)));
}

export type { CalendarEventStatus };
