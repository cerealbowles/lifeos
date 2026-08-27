"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DueBadge } from "@/components/dashboard/due-badge";
import { DomainAvatar, domainMeta } from "@/components/dashboard/domain-icon";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { ItemDetailSheet, itemOpensSheet } from "@/components/dashboard/item-detail-sheet";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import { getCompleteRequest } from "@/lib/today/complete";
import { formatInUserZone } from "@/lib/format";
import type { CandidateDomain, RankedItem } from "@/lib/today/ranking";

/**
 * DECISIONS.md ADR-102/103 — same fix shape as ADR-101 (finance): DueBadge alone renders
 * nothing for anything past the due-soon window, so TODAY items 4-14 days out (this card's
 * whole range) need a plain date/time too. Calendar and sports carry a specific time worth
 * showing; every other domain here only tracks a date, matching
 * components/finance/accounts-list.tsx's "MMM d".
 *
 * ADR-103: calendar/sports originally used weekday-only ("Thu 8:00 PM", matching
 * components/sports/game-card.tsx's own "EEE h:mm a") — but that card is scoped to *today's*
 * games specifically, with no ambiguity about which day "Thu" means. Here, TODAY's own
 * 14-day lookahead means a weekday alone is genuinely ambiguous (a real report: "Thu" read as
 * "this Thursday" when the event was two weeks out) — the actual date is the whole point, so
 * it's included instead of the weekday, not alongside it (keeps the label from growing past
 * what this narrow column comfortably fits).
 */
function formatItemDate(dueAt: Date, timezone: string, domain: CandidateDomain): string {
  if (domain === "calendar" || domain === "sports") {
    return formatInUserZone(dueAt, timezone, "MMM d, h:mm a");
  }
  return formatInUserZone(dueAt, timezone, "MMM d");
}

export function TodayGroupCard({
  domain,
  title,
  items,
  overflow = 0,
  timezone,
}: {
  domain: CandidateDomain;
  title: string;
  items: RankedItem[];
  /** DECISIONS.md ADR-063/079 — how many more exist beyond what's shown here. */
  overflow?: number;
  timezone: string;
}) {
  const router = useRouter();
  const { collapseThen, isCollapsing } = useCollapseThen();
  const [openItem, setOpenItem] = useState<RankedItem | null>(null);

  const complete = useMutation({
    mutationFn: (item: RankedItem) => {
      const req = getCompleteRequest(item);
      if (!req) return Promise.resolve();
      return apiFetch(req.url, req.init);
    },
    onSuccess: () => router.refresh(),
  });

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle href={domainMeta(domain).href}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <ul className="flex flex-col">
          {items.map((item) => {
            const completable = getCompleteRequest(item) !== null;
            const rowClassName =
              "flex flex-1 items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60";
            const rowContent = (
              <>
                <DomainAvatar domain={domain} tone="muted" />
                <span className="flex-1 truncate">
                  <span className="block truncate font-medium">{item.title}</span>
                  {item.subtitle && (
                    <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {item.subtitle}
                    </span>
                  )}
                </span>
                {item.dueAt && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-neutral-400">{formatItemDate(item.dueAt, timezone, domain)}</span>
                    <DueBadge due={item.due} domain={domain} live={item.live} />
                  </div>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
              </>
            );
            return (
              <CollapsibleItem key={item.id} collapsed={isCollapsing(item.id)}>
                <div className="flex items-center gap-1">
                  {completable && (
                    <Checkbox
                      checked={false}
                      disabled={complete.isPending}
                      onChange={() => collapseThen(item.id, () => complete.mutate(item))}
                      className="ml-2"
                    />
                  )}
                  {itemOpensSheet(item) ? (
                    <button type="button" onClick={() => setOpenItem(item)} className={rowClassName}>
                      {rowContent}
                    </button>
                  ) : (
                    <Link href={item.href ?? domainMeta(domain).href} className={rowClassName}>
                      {rowContent}
                    </Link>
                  )}
                </div>
              </CollapsibleItem>
            );
          })}
          {overflow > 0 && (
            <li>
              <Link
                href={domainMeta(domain).href}
                className="block rounded-lg px-2 py-1.5 text-xs text-neutral-400 hover:underline dark:text-neutral-500"
              >
                + {overflow} more
              </Link>
            </li>
          )}
        </ul>
      </CardContent>
      <ItemDetailSheet
        item={openItem}
        onClose={() => setOpenItem(null)}
        onCheckedIn={() => {
          const id = openItem?.id ?? null;
          setOpenItem(null);
          if (id) collapseThen(id, () => router.refresh());
        }}
      />
    </Card>
  );
}
