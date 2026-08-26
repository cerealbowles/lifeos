"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { MEASUREMENT_RANGES, MEASUREMENT_RANGE_LABELS, type MeasurementRange } from "@/lib/measurements/range";
import type { MeasurementDTO } from "@/lib/measurements/types";

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 160;
const PADDING = { top: 16, right: 12, bottom: 24, left: 12 };

/**
 * DECISIONS.md ADR-092. Hand-rolled SVG, not a charting library — extracted from what was
 * originally WeightChart's own inline implementation, generalized by `type`/`unit` so heart
 * rate and HRV (both already flowing into `measurements` with `source: "whoop"`) can reuse
 * the exact same range-toggle + line-chart behavior instead of three near-identical copies.
 * `WeightChart` is now a thin wrapper around this; behavior is unchanged for weight.
 */
export function MeasurementTrendChart({
  type,
  unit,
  defaultRange = "90d",
  emptyLabel = "No readings yet",
  windowMinutes,
}: {
  type: string;
  unit: string;
  defaultRange?: MeasurementRange;
  emptyLabel?: string;
  /**
   * Narrows to the last N minutes client-side, on top of whatever `defaultRange` fetches —
   * a quick "for now" window (Whoop's heart rate/HRV sync every ~15 min, so 30d of history
   * is mostly noise for "what's it doing right now") rather than plumbing a new
   * minute-granularity range through /api/measurements, which only offers day/month
   * buckets (MEASUREMENT_RANGES). Hides the range toggle when set — a fixed window doesn't
   * make sense next to a "6mo"/"12mo" picker.
   */
  windowMinutes?: number;
}) {
  const [range, setRange] = useState<MeasurementRange>(defaultRange);

  const { data, isLoading } = useQuery({
    queryKey: ["measurements", type, range],
    queryFn: () => apiFetch<{ measurements: MeasurementDTO[] }>(`/api/measurements?type=${type}&range=${range}`),
  });

  let points = (data?.measurements ?? []).map((m) => ({ value: Number(m.value), measuredAt: new Date(m.measuredAt) }));
  if (windowMinutes !== undefined) {
    // new Date(), not Date.now() — matches the existing convention elsewhere in this
    // codebase (e.g. workout-log.tsx, plant-grid.tsx) for "current time" during render.
    const cutoff = new Date().getTime() - windowMinutes * 60 * 1000;
    points = points.filter((p) => p.measuredAt.getTime() >= cutoff);
  }

  return (
    <div className="flex flex-col gap-3">
      {windowMinutes === undefined && (
        <div className="flex w-fit rounded-full bg-neutral-100 p-1 text-xs dark:bg-neutral-800">
          {MEASUREMENT_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition-colors",
                range === r
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                  : "text-neutral-500 dark:text-neutral-400",
              )}
            >
              {MEASUREMENT_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : points.length < 2 ? (
        <p className="text-sm text-neutral-400">
          {points.length === 0 ? emptyLabel : "Add one more reading"}
          {windowMinutes === undefined ? " to see a trend for this range." : "."}
        </p>
      ) : (
        <LineChart points={points} unit={unit} showTimeOfDay={windowMinutes !== undefined} />
      )}
    </div>
  );
}

function LineChart({
  points,
  unit,
  showTimeOfDay = false,
}: {
  points: { value: number; measuredAt: Date }[];
  unit: string;
  /** A 30-min window is always "today" — the date label is useless there; show clock time instead. */
  showTimeOfDay?: boolean;
}) {
  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  // A little vertical padding so the line never touches the top/bottom edge — and a nonzero
  // spread even when every reading is identical, so the chart doesn't divide by zero.
  const spread = Math.max(maxValue - minValue, 1);
  const yMin = minValue - spread * 0.15;
  const yMax = maxValue + spread * 0.15;

  const minTime = points[0].measuredAt.getTime();
  const maxTime = points[points.length - 1].measuredAt.getTime();
  const timeSpread = Math.max(maxTime - minTime, 1);

  const innerWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;

  const coords = points.map((p) => {
    const x = PADDING.left + ((p.measuredAt.getTime() - minTime) / timeSpread) * innerWidth;
    const y = PADDING.top + (1 - (p.value - yMin) / (yMax - yMin)) * innerHeight;
    return { x, y, value: p.value, date: p.measuredAt };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-40 w-full" preserveAspectRatio="none">
      {/* Axis labels: just the range's min/max value and its first/last date — "pretty
          simple," not a fully gridlined chart. */}
      <text x={PADDING.left} y={12} className="fill-neutral-400 text-[9px]">
        {maxValue.toFixed(1)} {unit}
      </text>
      <text x={PADDING.left} y={VIEWBOX_HEIGHT - 6} className="fill-neutral-400 text-[9px]">
        {minValue.toFixed(1)} {unit}
      </text>
      <text x={VIEWBOX_WIDTH - PADDING.right} y={VIEWBOX_HEIGHT - 6} textAnchor="end" className="fill-neutral-400 text-[9px]">
        {showTimeOfDay
          ? coords[coords.length - 1].date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
          : coords[coords.length - 1].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </text>
      <text x={PADDING.left} y={VIEWBOX_HEIGHT - 16} className="fill-neutral-400 text-[9px]">
        {showTimeOfDay
          ? coords[0].date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
          : coords[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </text>

      <path d={linePath} fill="none" strokeWidth={2} className="stroke-accent dark:stroke-accent-dark" />

      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2.5} className="fill-accent dark:fill-accent-dark">
          <title>
            {c.value} {unit} — {c.date.toLocaleDateString()}
          </title>
        </circle>
      ))}
    </svg>
  );
}
