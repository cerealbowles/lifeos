import "server-only";

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sendPush } from "./push";
import type { NotificationCategory } from "@/lib/db/schema";

const LIST_LIMIT = 50;

export async function listNotifications(userId: string) {
  return db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(LIST_LIMIT);
}

export async function getUnreadCount(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));

  return row?.count ?? 0;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const [row] = await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.id, notificationId), eq(schema.notifications.userId, userId)))
    .returning();

  return row ?? null;
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
}

/**
 * Only IMMEDIATE/TIME_SENSITIVE notifications actually interrupt the user with a push —
 * DIGEST/SILENT are written for the in-app list only, per docs/CALM_COMPUTING_DECISIONS.md's
 * Notification Philosophy ("every notification should answer: why does this deserve
 * interruption rather than waiting inside LifeOS?").
 */
export async function createNotification(input: {
  userId: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}) {
  const shouldPush = input.category === "immediate" || input.category === "time_sensitive";

  const [notification] = await db
    .insert(schema.notifications)
    .values({
      userId: input.userId,
      type: input.type,
      category: input.category,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
      url: input.url,
      metadata: input.metadata,
      sentAt: shouldPush ? new Date() : null,
    })
    .returning();

  if (shouldPush) {
    await pushToAllSubscriptions(input.userId, { title: input.title, body: input.body, url: input.url });
  }

  return notification;
}

async function pushToAllSubscriptions(userId: string, payload: { title: string; body?: string; url?: string }) {
  const subscriptions = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId));

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(() => "sent" as const); // A misconfigured push provider shouldn't block notification creation.

      if (result === "gone") {
        await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
      }
    }),
  );
}

/**
 * Dedupe window for the notifications job (lib/jobs/registry.ts) — an entity that already
 * has a notification within this window is skipped, so a NOW item that stays in NOW across
 * several job runs doesn't re-alert every run. CLAUDE.md: "avoid resurfacing... recently
 * surfaced."
 */
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function hasRecentNotification(userId: string, entityType: string, entityId: string, now: Date) {
  const since = new Date(now.getTime() - DEDUPE_WINDOW_MS);

  const [row] = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.entityType, entityType),
        eq(schema.notifications.entityId, entityId),
        gte(schema.notifications.createdAt, since),
      ),
    )
    .limit(1);

  return !!row;
}

export async function savePushSubscription(userId: string, subscription: { endpoint: string; p256dh: string; auth: string }) {
  await db
    .insert(schema.pushSubscriptions)
    .values({ userId, ...subscription })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId, p256dh: subscription.p256dh, auth: subscription.auth },
    });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.userId, userId), eq(schema.pushSubscriptions.endpoint, endpoint)));
}

export async function hasActivePushSubscription(userId: string, endpoint: string) {
  const [row] = await db
    .select({ id: schema.pushSubscriptions.id })
    .from(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.userId, userId), eq(schema.pushSubscriptions.endpoint, endpoint)))
    .limit(1);

  return !!row;
}
