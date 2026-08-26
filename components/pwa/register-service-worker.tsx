"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js. Production-only and deliberately silent on failure — a missing
 * service worker degrades to "just a normal web page," never breaks the app (DECISIONS.md
 * ADR-008's "usable without AI" principle extended to "usable without a healthy PWA layer").
 * Skipped in dev: a service worker caching `next dev`'s constantly-changing output is a
 * well-known source of "why isn't my change showing up" confusion.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal — see comment above.
    });
  }, []);

  return null;
}
