"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { SleepSessionDTO, SleepStageSegmentDTO } from "@/lib/sleep/types";

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 120;
const PADDING = { top: 10, right: 12, bottom: 20, left: 44 };

// Top-to-bottom placement, most-awake to most-asleep — the strap's own 4 raw states
// (Gen5SleepState in mobile/whoop-bridge), not invented sleep-science stages.
const STAGE_ORDER: Record<string, number> = { up: 0, wake: 1, still: 2, sleep: 3 };
const STAGE_LABEL: Record<string, string> = { up: "Up", wake: "Wake", still: "Still", sleep: "Sleep" };
const STAGE_COLOR: Record<string, string> = {
  up: "fill-neutral-400 stroke-neutral-400 dark:fill-neutral-500 dark:stroke-neutral-500",
  wake: "fill-amber-500 stroke-amber-500 dark:fill-amber-400 dark:stroke-amber-400",
  still: "fill-sky-500 stroke-sky-500 dark:fill-sky-400 dark:stroke-sky-400",
  sleep: "fill-accent stroke-accent dark:fill-accent-dark dark:stroke-accent-dark",
};

/**
 * Hand-rolled SVG step chart (DECISIONS.md ADR-092's precedent, same technique as the line
 * charts, different path shape) — one horizontal run per stage segment plus a vertical
 * connector at each transition, the standard "hypnogram" look. Fetches its own session
 * detail (`GET /api/sleep/sessions/[id]`) so SleepLog only needs to pass an id.
 */
export function SleepHypnogram({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sleep-session", sessionId],
    queryFn: () => apiFetch<{ session: SleepSessionDTO; segments: SleepStageSegmentDTO[] }>(`/api/sleep/sessions/${sessionId}`),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (!data || data.segments.length === 0) {
    return <p className="text-sm text-neutral-400">No stage detail recorded for this session.</p>;
  }

  const segments = data.segments;
  const startMs = new Date(segments[0].startedAt).getTime();
  const endMs = new Date(segments[segments.length - 1].endedAt).getTime();
  const timeSpread = Math.max(endMs - startMs, 1);

  const innerWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;
  const rowHeight = innerHeight / 4;

  const xFor = (iso: string) => PADDING.left + ((new Date(iso).getTime() - startMs) / timeSpread) * innerWidth;
  const yFor = (stage: string) => PADDING.top + (STAGE_ORDER[stage] ?? 1) * rowHeight + rowHeight / 2;

  // One path per segment (M start L end at the segment's own row) plus a connector between
  // consecutive segments at their shared boundary — this is what makes it read as a
  // continuous staircase rather than disconnected floating bars.
  const stagePaths: { stage: string; d: string }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const x1 = xFor(seg.startedAt);
    const x2 = xFor(seg.endedAt);
    const y = yFor(seg.stage);
    let d = `M ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)}`;
    const next = segments[i + 1];
    if (next) {
      const nextY = yFor(next.stage);
      d += ` M ${x2.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${nextY.toFixed(1)}`;
    }
    stagePaths.push({ stage: seg.stage, d });
  }

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-32 w-full" preserveAspectRatio="none">
        {Object.entries(STAGE_ORDER).map(([stage, order]) => (
          <text key={stage} x={4} y={PADDING.top + order * rowHeight + rowHeight / 2 + 3} className="fill-neutral-400 text-[8px]">
            {STAGE_LABEL[stage]}
          </text>
        ))}
        {stagePaths.map((p, i) => (
          <path key={i} d={p.d} fill="none" strokeWidth={3} strokeLinecap="round" className={STAGE_COLOR[p.stage] ?? "stroke-neutral-400"} />
        ))}
        <text x={PADDING.left} y={VIEWBOX_HEIGHT - 4} className="fill-neutral-400 text-[9px]">
          {new Date(segments[0].startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </text>
        <text x={VIEWBOX_WIDTH - PADDING.right} y={VIEWBOX_HEIGHT - 4} textAnchor="end" className="fill-neutral-400 text-[9px]">
          {new Date(segments[segments.length - 1].endedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </text>
      </svg>
    </div>
  );
}
