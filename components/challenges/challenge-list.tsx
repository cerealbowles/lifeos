"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ChallengeDTO } from "@/lib/challenges/types";

const STATUS_LABEL: Record<ChallengeDTO["status"], string> = {
  active: "Active",
  completed: "Completed",
  abandoned: "Abandoned",
};

export function ChallengeList() {
  const { data, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: () => apiFetch<{ challenges: ChallengeDTO[] }>("/api/challenges"),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading challenges…</p>;

  const challenges = data?.challenges ?? [];
  if (challenges.length === 0) {
    return <p className="text-sm text-neutral-400">No challenges yet — start one above.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {challenges.map((challenge) => (
        <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
          <Card className="transition-colors hover:border-neutral-400 dark:hover:border-neutral-600">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                <Flame className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {challenge.name}
                  {challenge.status !== "active" && <Badge variant="outline">{STATUS_LABEL[challenge.status]}</Badge>}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {challenge.durationDays} days · started {challenge.startDate}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
