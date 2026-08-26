"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { SkinTempBaseline, SkinTempBaselineStatus } from "@/lib/whoop/service";

// Reuses the existing Badge variants (due-badge.tsx's palette) rather than inventing new
// status colors — "high"/"very_low" get the same red as an overdue task, "elevated"/"low"
// the same amber as due-soon, "normal" the same green success already used elsewhere.
const STATUS_VARIANT: Record<SkinTempBaselineStatus, BadgeProps["variant"]> = {
  high: "overdue",
  elevated: "due",
  normal: "success",
  low: "due",
  very_low: "overdue",
};

const STATUS_LABEL: Record<SkinTempBaselineStatus, string> = {
  high: "Well above baseline",
  elevated: "Above baseline",
  normal: "Normal",
  low: "Below baseline",
  very_low: "Well below baseline",
};

/**
 * A starting heuristic, not a medical claim — see getSkinTempBaseline's doc comment for the
 * exact trailing-window/threshold reasoning. Self-suppresses to an explanatory line until
 * there's enough history to compute a baseline at all, same "avoid a permanent empty card"
 * instinct as WhoopCard.
 */
export function SkinTempBaselineCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["whoop-skin-temp-baseline"],
    queryFn: () => apiFetch<SkinTempBaseline>("/api/whoop/skin-temp-baseline"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skin Temp Baseline</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : !data?.latest ? (
          <p className="text-sm text-neutral-400">
            Not connected yet — pair the Whoop Bridge companion app with your strap to start syncing.
          </p>
        ) : data.baseline === null ? (
          <div className="flex items-center gap-3">
            <TempIcon />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {data.latest.value.toFixed(1)}°{data.latest.unit}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Still building a baseline ({data.baselineSampleCount} reading{data.baselineSampleCount === 1 ? "" : "s"} so
                far) — check back after a couple weeks of syncing.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <TempIcon />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {data.latest.value.toFixed(1)}°{data.latest.unit}
                </p>
                <Badge variant={STATUS_VARIANT[data.status!]}>{STATUS_LABEL[data.status!]}</Badge>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Baseline {data.baseline.toFixed(1)}°{data.latest.unit} ({data.baselineSampleCount}-reading trailing
                median) · {data.deviation! >= 0 ? "+" : ""}
                {data.deviation!.toFixed(1)}° · {formatDistanceToNow(new Date(data.latest.measuredAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TempIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
      <Thermometer className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}
