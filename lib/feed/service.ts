import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { joinWithAnd } from "@/lib/format";
import { RssFeedProvider, FeedProviderError } from "./provider";
import type { FeedSubscription } from "@/lib/db/schema";

export { FeedProviderError };

// Same cadence as weather/calendar/sports: enforced lazily here (getFeedItems re-syncs on
// read if stale, kept as the fallback) and proactively by the background worker on this same
// interval (refreshAllDueFeedSubscriptions below, DECISIONS.md ADR-088).
const SYNC_TTL_MS = 30 * 60 * 1000;
const ITEMS_LIMIT = 60;

const provider = new RssFeedProvider();

export async function addFeedSubscription(userId: string, feedUrl: string) {
  const remote = await provider.fetchFeed(feedUrl);

  const [subscription] = await db
    .insert(schema.feedSubscriptions)
    .values({
      userId,
      feedUrl,
      title: remote.title,
      siteUrl: remote.siteUrl,
      lastSyncedAt: new Date(),
    })
    .returning();

  await upsertItems(feedUrl, remote.items);

  return subscription;
}

export async function removeFeedSubscription(userId: string, id: string) {
  await db
    .delete(schema.feedSubscriptions)
    .where(and(eq(schema.feedSubscriptions.id, id), eq(schema.feedSubscriptions.userId, userId)));
}

export async function listFeedSubscriptions(userId: string) {
  return db
    .select()
    .from(schema.feedSubscriptions)
    .where(eq(schema.feedSubscriptions.userId, userId))
    .orderBy(schema.feedSubscriptions.title);
}

async function upsertItems(feedUrl: string, items: Awaited<ReturnType<RssFeedProvider["fetchFeed"]>>["items"]) {
  for (const item of items) {
    await db
      .insert(schema.feedItems)
      .values({
        feedUrl,
        guid: item.guid,
        title: item.title,
        link: item.link,
        summary: item.summary,
        publishedAt: item.publishedAt,
      })
      .onConflictDoUpdate({
        target: [schema.feedItems.feedUrl, schema.feedItems.guid],
        set: { title: item.title, link: item.link, summary: item.summary, publishedAt: item.publishedAt },
      });
  }
}

async function syncSubscription(sub: FeedSubscription, now: Date): Promise<void> {
  const remote = await provider.fetchFeed(sub.feedUrl);
  await upsertItems(sub.feedUrl, remote.items);
  await db.update(schema.feedSubscriptions).set({ lastSyncedAt: now }).where(eq(schema.feedSubscriptions.id, sub.id));
}

/**
 * DECISIONS.md ADR-088 — the background worker's feed job. Two users subscribed to the
 * identical feedUrl still each get their own fetch, since feedSubscriptions.lastSyncedAt is
 * per-row and there's no shared per-URL sync state to bump instead.
 */
export async function refreshAllDueFeedSubscriptions(now: Date = new Date()): Promise<{ refreshed: number; failed: number }> {
  const subscriptions = await db.select().from(schema.feedSubscriptions);
  const due = subscriptions.filter((s) => !s.lastSyncedAt || now.getTime() - s.lastSyncedAt.getTime() > SYNC_TTL_MS);
  const results = await Promise.allSettled(due.map((sub) => syncSubscription(sub, now)));

  return {
    refreshed: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

/**
 * Recent items across all of a user's subscribed feeds, newest first. Lazy-syncs any
 * subscription stale past the TTL first; one feed's fetch failure doesn't block the rest.
 */
export async function getFeedItems(userId: string, now: Date = new Date()) {
  const subscriptions = await listFeedSubscriptions(userId);
  if (subscriptions.length === 0) return [];

  await Promise.all(
    subscriptions
      .filter((s) => !s.lastSyncedAt || now.getTime() - s.lastSyncedAt.getTime() > SYNC_TTL_MS)
      .map((s) => syncSubscription(s, now).catch(() => undefined)),
  );

  const feedUrls = subscriptions.map((s) => s.feedUrl);
  const titleByUrl = new Map(subscriptions.map((s) => [s.feedUrl, s.title]));

  const items = await db
    .select()
    .from(schema.feedItems)
    .where(inArray(schema.feedItems.feedUrl, feedUrls))
    .orderBy(desc(schema.feedItems.publishedAt))
    .limit(ITEMS_LIMIT);

  return items.map((item) => ({ ...item, feedTitle: titleByUrl.get(item.feedUrl) ?? item.feedUrl }));
}

/**
 * Wraps getFeedItems with the "you're caught up" closure state from DECISIONS.md ADR-052 —
 * splits items into new-since-last-visit vs. already-seen using `users.feedLastViewedAt`,
 * then advances that cursor to `now`. Called once per page load (GET /api/feed/items) — a
 * second fetch in the same session correctly reports 0 new, since viewing the list *is* the
 * acknowledgement (no separate "mark as read" action needed).
 *
 * `digest` is the source doc's fuller Feed Philosophy framing ("Since this morning: 3 things
 * worth knowing. Sports — one update. RSS — one article.") applied to what we actually have:
 * one source type (RSS) but multiple subscriptions, so the breakdown is per-feed rather than
 * per-category. Compressed into one sentence via joinWithAnd, same pattern as the Today page's
 * glance summary (ADR-043 — no bare per-source count badges either).
 */
export async function getFeedCatchUp(userId: string, previousViewedAt: Date | null, now: Date = new Date()) {
  const items = await getFeedItems(userId, now);

  const isNew = (publishedAt: Date | null) =>
    previousViewedAt !== null && publishedAt !== null && publishedAt > previousViewedAt;

  const newItems = items.filter((item) => isNew(item.publishedAt));

  const countByFeed = new Map<string, number>();
  for (const item of newItems) {
    countByFeed.set(item.feedTitle, (countByFeed.get(item.feedTitle) ?? 0) + 1);
  }
  const newByFeed = [...countByFeed.entries()]
    .map(([feedTitle, count]) => ({ feedTitle, count }))
    .sort((a, b) => b.count - a.count);
  const digest =
    newByFeed.length > 0
      ? joinWithAnd(newByFeed.map(({ feedTitle, count }) => `${count} from ${feedTitle}`))
      : null;

  await db.update(schema.users).set({ feedLastViewedAt: now }).where(eq(schema.users.id, userId));

  return {
    items: items.map((item) => ({ ...item, isNew: isNew(item.publishedAt) })),
    newCount: newItems.length,
    newByFeed,
    digest,
    hasPreviousVisit: previousViewedAt !== null,
  };
}
