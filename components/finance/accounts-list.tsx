"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { DomainAvatar } from "@/components/dashboard/domain-icon";
import { DueBadge } from "@/components/dashboard/due-badge";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import { getDueSummary } from "@/lib/tasks/status";
import type { AccountDTO } from "@/lib/finance/types";

export function AccountsList({ timezone }: { timezone: string }) {
  const queryClient = useQueryClient();
  const { collapseThen, isCollapsing } = useCollapseThen();

  const { data, isLoading } = useQuery({
    queryKey: ["finance-accounts"],
    queryFn: () => apiFetch<{ accounts: AccountDTO[] }>("/api/finance/accounts"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/finance/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["finance-reminders"] });
    },
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading accounts…</p>;

  const accounts = data?.accounts ?? [];
  if (accounts.length === 0) {
    return <p className="text-sm text-neutral-400">No accounts yet. Add one above.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      {accounts.map((account) => (
        <CollapsibleItem key={account.id} collapsed={isCollapsing(account.id)}>
          <div className="flex items-center gap-3 py-2">
            <DomainAvatar domain="financial" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{account.name}</p>
              <p className="truncate text-xs capitalize text-neutral-500 dark:text-neutral-400">
                {account.accountType.replace("_", " ")}
                {account.lastFour ? ` · •••• ${account.lastFour}` : ""}
              </p>
            </div>
            {account.nextStatementCloseAt && (
              <div className="flex flex-col items-end gap-0.5">
                {/* DECISIONS.md ADR-101 — DueBadge only renders for overdue/due-soon (within
                    DUE_SOON_WINDOW_DAYS), by design, so a statement close 1-2+ weeks out
                    rendered nothing at all next to "Statement closes" — the actual date, not
                    just an urgency badge, is the thing being asked for here. The badge still
                    shows alongside once it's actually close. */}
                <span className="text-xs text-neutral-400">
                  Closes {format(new Date(account.nextStatementCloseAt), "MMM d")}
                </span>
                <DueBadge due={getDueSummary(new Date(account.nextStatementCloseAt), timezone)} />
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => collapseThen(account.id, () => remove.mutate(account.id))}
              aria-label={`Delete ${account.name}`}
            >
              <Trash2 className="h-4 w-4 text-neutral-400" />
            </Button>
          </div>
        </CollapsibleItem>
      ))}
    </ul>
  );
}
