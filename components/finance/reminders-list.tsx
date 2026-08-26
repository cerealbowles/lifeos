"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DomainAvatar } from "@/components/dashboard/domain-icon";
import { DueBadge } from "@/components/dashboard/due-badge";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import { getDueSummary } from "@/lib/tasks/status";
import type { ReminderDTO } from "@/lib/finance/types";

export function RemindersList({ timezone }: { timezone: string }) {
  const queryClient = useQueryClient();
  const { collapseThen, isCollapsing } = useCollapseThen();

  const { data, isLoading } = useQuery({
    queryKey: ["finance-reminders"],
    queryFn: () => apiFetch<{ reminders: ReminderDTO[] }>("/api/finance/reminders"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/finance/reminders/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance-reminders"] }),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading reminders…</p>;

  const reminders = data?.reminders ?? [];
  if (reminders.length === 0) {
    return <p className="text-sm text-neutral-400">No payment reminders yet. Add one above.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      {reminders.map((reminder) => (
        <CollapsibleItem key={reminder.id} collapsed={isCollapsing(reminder.id)}>
          <div className="flex items-center gap-3 py-2">
            <DomainAvatar domain="financial" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{reminder.name}</p>
              {reminder.amount && <p className="text-xs text-neutral-500 dark:text-neutral-400">${reminder.amount}</p>}
            </div>
            {reminder.autopay && <Badge variant="success">Autopay</Badge>}
            {/* DECISIONS.md ADR-101 — same fix as accounts-list.tsx: DueBadge alone rendered
                nothing for any bill more than a few days out, same underlying issue. */}
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs text-neutral-400">
                Due {format(new Date(reminder.nextDueAt), "MMM d")}
              </span>
              <DueBadge due={getDueSummary(new Date(reminder.nextDueAt), timezone)} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => collapseThen(reminder.id, () => remove.mutate(reminder.id))}
              aria-label={`Delete ${reminder.name}`}
            >
              <Trash2 className="h-4 w-4 text-neutral-400" />
            </Button>
          </div>
        </CollapsibleItem>
      ))}
    </ul>
  );
}
