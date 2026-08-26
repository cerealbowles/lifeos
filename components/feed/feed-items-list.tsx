"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Rss } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import type { FeedCatchUpDTO } from "@/lib/feed/types";

/**
 * DECISIONS.md ADR-052/074 ("Feed should provide closure, not endless consumption" + the
 * source doc's fuller Feed Philosophy digest framing — "Since this morning: 3 things worth
 * knowing. Sports — one update. RSS — one article.") — leads with a "you're caught up" /
 * "N new — 2 from Hacker News and 1 from The Verge" banner instead of just a bare count or a
 * flat list with no sense of what's actually new. We only have one source *type* (RSS) so
 * the breakdown is per-subscription rather than per-category, but the shape (one compressed
 * sentence naming where the new items came from) matches the doc's intent. The list itself
 * stays visible either way (no milestone yet for a collapsed/grouped view), but the banner
 * gives the closure moment ADR-052 asks for.
 */
export function FeedItemsList() {
  const { data, isLoading, error } = useQuery<FeedCatchUpDTO, ApiError>({
    queryKey: ["feed-items"],
    queryFn: () => apiFetch<FeedCatchUpDTO>("/api/feed/items"),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading feed…</p>;
  if (error) return <p className="text-sm text-amber-700 dark:text-amber-400">{error.message}</p>;

  const items = data?.items ?? [];
  const newCount = data?.newCount ?? 0;
  const digest = data?.digest ?? null;
  const hasPreviousVisit = data?.hasPreviousVisit ?? false;

  if (items.length === 0) {
    return <p className="text-sm text-neutral-400">No items yet — your subscribed feeds haven&apos;t published anything recent.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {!hasPreviousVisit
          ? `${items.length} item${items.length === 1 ? "" : "s"} to catch up on.`
          : newCount > 0
            ? `${newCount} new since your last visit — ${digest}.`
            : "You're caught up. Nothing new since you were last here."}
      </p>

      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <Rss className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={item.link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-sm font-medium hover:underline"
                >
                  {item.title}
                </a>
                {item.isNew && (
                  <Badge variant="due" className="shrink-0">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {item.feedTitle}
                {item.publishedAt ? ` · ${format(new Date(item.publishedAt), "EEE, MMM d 'at' h:mm a")}` : ""}
              </p>
              {item.summary && (
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{item.summary}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
