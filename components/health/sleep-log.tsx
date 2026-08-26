"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { SleepHypnogram } from "./sleep-hypnogram";
import type { SleepSessionDTO } from "@/lib/sleep/types";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "In progress";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Recent sleep_sessions — a plain list, not a per-session stage breakdown (the list
 * endpoint deliberately doesn't join segments; fetching those per row for every session in
 * the list would be N extra requests for a summary the hypnogram already covers better once
 * you actually want the detail). Clicking a row fetches and expands that session's
 * SleepHypnogram in place — one shared client-side selection, no separate route needed.
 */
export function SleepLog() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sleep-sessions"],
    queryFn: () => apiFetch<{ sessions: SleepSessionDTO[] }>("/api/sleep/sessions?range=30d"),
  });

  const sessions = data?.sessions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sleep Log</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Not connected yet — pair the Whoop Bridge companion app with your strap to start syncing.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(selectedId === session.id ? null : session.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
                    selectedId === session.id && "bg-neutral-50 dark:bg-neutral-800/60",
                  )}
                >
                  <span className="font-medium">
                    {new Date(session.startedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">{formatDuration(session.durationSeconds)}</span>
                </button>
                {selectedId === session.id && (
                  <div className="px-2 pb-3">
                    <SleepHypnogram sessionId={session.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
