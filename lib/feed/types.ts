// Client-safe (no "server-only") — shared between the browser (Settings form, /feed page)
// and lib/feed/provider.ts, which does import "server-only".
export type FeedSubscriptionDTO = {
  id: string;
  feedUrl: string;
  title: string;
  siteUrl: string | null;
};

export type FeedItemDTO = {
  id: string;
  feedTitle: string;
  title: string;
  link: string | null;
  summary: string | null;
  publishedAt: string | null;
  isNew: boolean;
};

/**
 * DECISIONS.md ADR-052 ("Feed should provide closure, not endless consumption") — items plus
 * a "since you last visited" split, computed against `users.feedLastViewedAt`. The caller
 * (GET /api/feed/items) advances that cursor to now as a side effect of fetching, so a
 * second fetch in the same session correctly reports 0 new.
 */
export type FeedCatchUpDTO = {
  items: FeedItemDTO[];
  newCount: number;
  /** Per-subscription breakdown of newCount, sorted by count descending. */
  newByFeed: Array<{ feedTitle: string; count: number }>;
  /** One compressed sentence ("2 from Hacker News and 1 from The Verge"), or null if nothing new. */
  digest: string | null;
  /** False on a user's very first-ever Feed visit — there's no "since last time" yet. */
  hasPreviousVisit: boolean;
};
