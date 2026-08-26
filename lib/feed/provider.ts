import "server-only";

import Parser from "rss-parser";

export class FeedProviderError extends Error {}

export type RemoteFeedItem = {
  guid: string;
  title: string;
  link: string | null;
  summary: string | null;
  publishedAt: Date | null;
};

export type RemoteFeed = {
  title: string;
  siteUrl: string | null;
  items: RemoteFeedItem[];
};

// RSS/Atom, per DECISIONS.md ADR-025 ("RSS is a strategic generic integration layer") — one
// parser handles both formats, no per-publisher integration needed.
const parser = new Parser({ timeout: 15_000 });

export class RssFeedProvider {
  async fetchFeed(feedUrl: string): Promise<RemoteFeed> {
    let parsed: Parser.Output<Record<string, unknown>>;
    try {
      parsed = await parser.parseURL(feedUrl);
    } catch (err) {
      throw new FeedProviderError(err instanceof Error ? err.message : `Could not read feed at ${feedUrl}`);
    }

    const items: RemoteFeedItem[] = (parsed.items ?? []).map((item) => {
      // Not every feed sets guid; the link is a reasonable stable fallback for dedup.
      const guid = item.guid ?? item.link ?? item.title ?? crypto.randomUUID();
      const publishedAt = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null;
      return {
        guid,
        title: item.title ?? "(untitled)",
        link: item.link ?? null,
        summary: item.contentSnippet ?? item.summary ?? null,
        publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
      };
    });

    return {
      title: parsed.title ?? feedUrl,
      siteUrl: parsed.link ?? null,
      items,
    };
  }
}
