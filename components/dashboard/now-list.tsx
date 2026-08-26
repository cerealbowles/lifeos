"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight, CircleCheck } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DueBadge } from "@/components/dashboard/due-badge";
import { DomainAvatar, domainMeta } from "@/components/dashboard/domain-icon";
import { SwipeToComplete } from "@/components/dashboard/swipe-to-complete";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import type { PulseState, RankedItem } from "@/lib/today/ranking";

/**
 * DECISIONS.md ADR-100. Which domains have a real, existing one-tap "complete" endpoint —
 * financial (no mark-paid action exists), calendar (an appointment isn't "completable" the
 * same way a task is), and sports (informational only) are deliberately excluded, not an
 * oversight. A pet-domain "birthday" is excluded too (computed occurrence, no underlying
 * pet_events row — see RankedItem.eventType).
 */
function getCompleteRequest(item: RankedItem): { url: string; init: RequestInit } | null {
  switch (item.domain) {
    case "task":
      return { url: `/api/tasks/${item.id}`, init: { method: "PATCH", body: JSON.stringify({ status: "done" }) } };
    case "routine":
      return { url: `/api/routines/${item.id}/complete`, init: { method: "POST" } };
    case "pet":
      if (item.eventType === "birthday") return null;
      // The [id] segment here is the pet id, but completePetEvent (lib/pets/service.ts)
      // scopes purely by (eventId, userId) — the route never actually reads it.
      return {
        url: `/api/pets/_/events/${item.id}`,
        init: { method: "PATCH", body: JSON.stringify({ completed: true }) },
      };
    case "grow":
      // Empty body — a swipe is the "yep, still fine" quick check-in (lib/growing/service.ts
      // already treats a check-in with nothing changed as a valid action).
      return { url: `/api/grow/${item.id}/check-in`, init: { method: "POST", body: JSON.stringify({}) } };
    case "financial":
    case "calendar":
    case "sports":
      return null;
  }
}

/**
 * DECISIONS.md ADR-044 ("Completion should restore calm, not backfill the freed space") —
 * when NOW empties out (the last thing gets completed, or there was simply nothing today),
 * show an explicit calm confirmation rather than silently rendering nothing. Not "Great! Here
 * are 7 other things" — just closure.
 *
 * Suppressed entirely (returns null) when `pulse === "calm"` — Life Pulse (ADR-076) already
 * owns the single "nothing needs you" statement for the whole page in that case; repeating it
 * here too would be the exact stacked-messaging problem ADR-044 already fixed once. Still
 * shown when NOW is empty but TODAY has content ("active" pulse) — that's genuinely distinct
 * information ("nothing urgent right now specifically"), not a repeat.
 */
export function NowList({ items, pulse }: { items: RankedItem[]; pulse: PulseState }) {
  const router = useRouter();
  const { collapseThen, isCollapsing } = useCollapseThen();

  const complete = useMutation({
    mutationFn: (item: RankedItem) => {
      const req = getCompleteRequest(item);
      if (!req) return Promise.resolve();
      return apiFetch(req.url, req.init);
    },
    onSuccess: () => router.refresh(),
  });

  if (items.length === 0) {
    if (pulse === "calm") return null;
    return (
      <Card className="animate-settle">
        <CardContent className="flex flex-col items-center gap-1 py-8 text-center">
          <CircleCheck className="h-6 w-6 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">All done.</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Nothing needs you right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-neutral-900 dark:text-neutral-100">Right now</CardTitle>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
          {items.length}
        </span>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const key = `${item.domain}-${item.id}`;
            const row = (
              <Link
                href={domainMeta(item.domain).href}
                className="flex items-center gap-3 rounded-lg bg-white p-2 text-sm hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
              >
                <DomainAvatar domain={item.domain} />
                <span className="flex-1 truncate">
                  <span className="block truncate font-medium">{item.title}</span>
                  {item.subtitle && (
                    <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {item.subtitle}
                    </span>
                  )}
                </span>
                <DueBadge due={item.due} domain={item.domain} live={item.live} />
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
              </Link>
            );

            const completable = getCompleteRequest(item) !== null;

            return (
              <CollapsibleItem key={key} collapsed={isCollapsing(key)}>
                {completable ? (
                  <SwipeToComplete onComplete={() => collapseThen(key, () => complete.mutate(item))}>
                    {row}
                  </SwipeToComplete>
                ) : (
                  row
                )}
              </CollapsibleItem>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
