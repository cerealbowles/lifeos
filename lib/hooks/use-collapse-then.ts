"use client";

import { useCallback, useState } from "react";

/**
 * How long CollapsibleItem's exit transition takes. Kept here (not in the component) so this
 * hook's setTimeout and the component's CSS transition-duration always agree without either
 * file depending on the other for it.
 */
export const COLLAPSE_DURATION_MS = 220;

/**
 * Pairs with components/dashboard/collapsible-item.tsx's CollapsibleItem. DECISIONS.md Motion
 * Principles ("completed attention collapses and recedes") — `collapseThen(id, action)` marks
 * `id` as collapsing (so the matching CollapsibleItem starts its exit transition) and only
 * fires the real mutation after the transition has had time to play, instead of an instant
 * hard cut the moment the query refetches.
 */
export function useCollapseThen() {
  const [collapsingIds, setCollapsingIds] = useState<Set<string>>(new Set());

  const collapseThen = useCallback((id: string, action: () => void) => {
    setCollapsingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    window.setTimeout(action, COLLAPSE_DURATION_MS);
  }, []);

  const isCollapsing = useCallback((id: string) => collapsingIds.has(id), [collapsingIds]);

  return { collapseThen, isCollapsing };
}
