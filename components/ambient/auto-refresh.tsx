"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — matches the lazy-sync TTL other integrations use.

/**
 * DECISIONS.md ADR-057/058 (Ambient Display) — this page is meant to be left open on a
 * dedicated device for hours, so it needs to keep itself current without anyone touching it.
 * `router.refresh()` re-runs the server component (weather, today's items) in place; the
 * clock ticks independently and much more often via LiveClock. Renders nothing.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
