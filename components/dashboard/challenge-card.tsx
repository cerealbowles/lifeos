"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Flame } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChallengeCardSummary = {
  challenge: { id: string; name: string; durationDays: number };
  day: number;
  todayDate: string;
  habits: { id: string; title: string; completedToday: boolean; autoCheck?: boolean }[];
  doneCount: number;
  totalCount: number;
};

/**
 * DECISIONS.md ADR-091. Self-suppressing like WeatherCard/HealthCard — renders nothing if
 * there's no active challenge, rather than an empty "no challenge" state nobody asked to see.
 * Only ever shows one challenge (getActiveChallengeSummary already picks the most recently
 * started "active" one) — Today isn't the place to browse a list of every challenge that's
 * ever existed, just the current one, per the original "see what day of the program I am on"
 * request.
 *
 * Client component (unlike WeatherCard/HealthCard, which are read-only) because it needs to
 * toggle today's habits inline without leaving Today. Data is a server-fetched prop, not a
 * useQuery cache, so a toggle uses router.refresh() afterward — same reasoning as
 * ActivityLogRow/BottomNavForm.
 */
export function ChallengeCard({ summary }: { summary: ChallengeCardSummary | null }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!summary) return null;
  const { challenge, day, todayDate, habits, doneCount, totalCount } = summary;

  async function toggle(habitId: string) {
    setPendingId(habitId);
    setError(null);
    try {
      await apiFetch(`/api/challenges/${challenge.id}/completions`, {
        method: "POST",
        body: JSON.stringify({ habitId, date: todayDate }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link href={`/challenges/${challenge.id}`} className="flex items-center gap-2 hover:underline">
            <Flame className="h-4 w-4 text-orange-500" strokeWidth={1.75} />
            {challenge.name} — Day {day} of {challenge.durationDays}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {doneCount} of {totalCount} done today
        </p>
        <div className="flex flex-col gap-1.5">
          {habits.map((habit) => (
            <button
              key={habit.id}
              type="button"
              disabled={pendingId === habit.id || habit.autoCheck}
              onClick={() => toggle(habit.id)}
              className={cn("flex items-center gap-2 text-left text-sm", habit.autoCheck && "cursor-default")}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  habit.completedToday
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-neutral-300 dark:border-neutral-600",
                )}
              >
                {habit.completedToday && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              <span className={habit.completedToday ? "text-neutral-400 line-through dark:text-neutral-500" : ""}>
                {habit.title}
              </span>
              {habit.autoCheck && <span className="ml-auto shrink-0 text-xs text-neutral-400">workout log</span>}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
