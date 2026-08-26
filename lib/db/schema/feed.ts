import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// Per-user, per DECISIONS.md ADR-025 ("RSS is a strategic generic integration layer").
// feedUrl is the subscription key rather than a separate feeds table — RSS has no stable
// numeric id to key on, and the URL itself is what a user actually provides.
export const feedSubscriptions = pgTable(
  "feed_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feedUrl: text("feed_url").notNull(),
    title: text("title").notNull(),
    siteUrl: text("site_url"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("feed_subscriptions_user_id_idx").on(table.userId),
    unique("feed_subscriptions_user_feed_key").on(table.userId, table.feedUrl),
  ],
);

export type FeedSubscription = typeof feedSubscriptions.$inferSelect;
export type NewFeedSubscription = typeof feedSubscriptions.$inferInsert;

// Not user-scoped — the same feed's items are identical shared reference data no matter
// which user(s) subscribe to it, same pattern as sports_events. Deduped by (feed_url, guid)
// on sync upsert; RSS/Atom guid falls back to the item link when a feed omits one.
export const feedItems = pgTable(
  "feed_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedUrl: text("feed_url").notNull(),
    guid: text("guid").notNull(),
    title: text("title").notNull(),
    link: text("link"),
    summary: text("summary"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("feed_items_feed_url_published_at_idx").on(table.feedUrl, table.publishedAt),
    unique("feed_items_feed_url_guid_key").on(table.feedUrl, table.guid),
  ],
);

export type FeedItem = typeof feedItems.$inferSelect;
export type NewFeedItem = typeof feedItems.$inferInsert;
