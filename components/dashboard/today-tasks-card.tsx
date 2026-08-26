"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DueBadge } from "@/components/dashboard/due-badge";
import { DomainAvatar, domainMeta } from "@/components/dashboard/domain-icon";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import { formatInUserZone } from "@/lib/format";
import type { RankedItem } from "@/lib/today/ranking";

/** The only interactive TODAY group — lets you complete a task without leaving the page. */
export function TodayTasksCard({
  items,
  overflow = 0,
  timezone,
}: {
  items: RankedItem[];
  /** DECISIONS.md ADR-063/079 — how many more exist beyond what's shown here. */
  overflow?: number;
  timezone: string;
}) {
  const router = useRouter();
  const { collapseThen, isCollapsing } = useCollapseThen();

  const complete = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) }),
    onSuccess: () => router.refresh(),
  });

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle href={domainMeta("task").href}>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <ul className="flex flex-col">
          {items.map((item) => (
            <CollapsibleItem key={item.id} collapsed={isCollapsing(item.id)}>
              <div className="flex items-center gap-3 rounded-lg p-2 text-sm">
                <Checkbox
                  checked={false}
                  disabled={complete.isPending}
                  onChange={() => collapseThen(item.id, () => complete.mutate(item.id))}
                />
                <DomainAvatar domain="task" tone="muted" />
                <span className="flex-1 truncate font-medium">{item.title}</span>
                {item.dueAt && (
                  // DECISIONS.md ADR-102 — same fix shape as ADR-101: DueBadge alone renders
                  // nothing past the due-soon window, so a task 4-14 days out needs a plain
                  // date too, using the same "MMM d" granularity as accounts-list.tsx.
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-neutral-400">
                      {formatInUserZone(item.dueAt, timezone, "MMM d")}
                    </span>
                    <DueBadge due={item.due} />
                  </div>
                )}
              </div>
            </CollapsibleItem>
          ))}
          {overflow > 0 && (
            <li>
              <Link
                href={domainMeta("task").href}
                className="block rounded-lg px-2 py-1.5 text-xs text-neutral-400 hover:underline dark:text-neutral-500"
              >
                + {overflow} more
              </Link>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
