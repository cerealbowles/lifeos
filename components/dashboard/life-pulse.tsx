"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { domainMeta } from "@/components/dashboard/domain-icon";
import type { CandidateDomain, PulseState, RankedItem } from "@/lib/today/ranking";

/**
 * Shared with components/ambient/ — one color mapping for pulse state, not duplicated.
 * DECISIONS.md ADR-090 — "active" is the app's one accent color (app/globals.css's
 * --accent/--accent-dark), and after this pass it's also the *only* place that color still
 * appears as a solid fill — the nav logo went monochrome and the Today tab dropped its
 * filled circle specifically so this dot wouldn't have to compete with anything else.
 */
export const PULSE_DOT_CLASS: Record<PulseState, string> = {
  calm: "bg-neutral-300 dark:bg-neutral-600",
  active: "bg-accent dark:bg-accent-dark",
  attention: "bg-amber-500",
  urgent: "bg-red-500",
};

function pulseLabel(pulse: PulseState, now: RankedItem[]): string {
  switch (pulse) {
    case "calm":
      return "Nothing needs you.";
    case "active":
      return "Nothing urgent — a few things on deck.";
    case "attention": {
      const n = now.length;
      return `${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} your attention.`;
    }
    case "urgent": {
      const n = now.filter((item) => item.due.status === "overdue").length;
      return `${n} overdue.`;
    }
  }
}

function topReasons(
  pulse: PulseState,
  now: RankedItem[],
  today: Partial<Record<CandidateDomain, RankedItem[]>>,
): RankedItem[] {
  if (pulse === "calm") return [];
  if (pulse === "active") {
    return Object.values(today)
      .flatMap((items) => items ?? [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
  return now.slice(0, 3);
}

/**
 * DECISIONS.md ADR-030/042/076 — Life Pulse: one persistent visual object representing the
 * overall attention state of the day, not a notification-count badge (ADR-043 — this reports
 * meaning, "N things need attention," never a bare unlabeled number sitting alone). Reuses
 * the same NOW/TODAY data already fetched for the rest of the page — no separate query.
 *
 * Deliberately no continuous animation despite the name: Motion Principles explicitly rule
 * out constant pulsing/decorative looping. The dot's color and the one-shot `animate-settle`
 * on page load are the only motion here.
 */
export function LifePulse({
  pulse,
  now,
  today,
}: {
  pulse: PulseState;
  now: RankedItem[];
  today: Partial<Record<CandidateDomain, RankedItem[]>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const reasons = topReasons(pulse, now, today);
  const canExpand = reasons.length > 0;

  return (
    <div className="animate-settle flex flex-col items-center gap-2 py-2 text-center">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={!canExpand}
        aria-expanded={canExpand ? expanded : undefined}
        className={cn("flex flex-col items-center gap-2", canExpand ? "cursor-pointer" : "cursor-default")}
      >
        <span className={cn("h-3.5 w-3.5 rounded-full", PULSE_DOT_CLASS[pulse])} aria-hidden="true" />
        <span className="text-base font-medium text-neutral-800 dark:text-neutral-100">{pulseLabel(pulse, now)}</span>
        {canExpand && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-neutral-300 transition-transform dark:text-neutral-600",
              expanded && "rotate-180",
            )}
          />
        )}
      </button>

      {expanded && canExpand && (
        <ul className="mt-1 flex w-full max-w-xs flex-col divide-y divide-neutral-100 text-left dark:divide-neutral-800">
          {reasons.map((item) => (
            <li key={`${item.domain}-${item.id}`}>
              <Link
                href={domainMeta(item.domain).href}
                className="flex items-center justify-between gap-2 py-1.5 text-sm text-neutral-600 hover:underline dark:text-neutral-300"
              >
                <span className="truncate">{item.title}</span>
                {item.subtitle && <span className="shrink-0 text-xs text-neutral-400">{item.subtitle}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
