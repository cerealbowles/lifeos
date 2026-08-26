import { formatDistanceToNow } from "date-fns";
import { HeartPulse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewWeightForm } from "./new-weight-form";
import { WeightChart } from "./weight-chart";
import { WeightLog } from "./weight-log";
import type { LatestMeasurement } from "@/lib/measurements/service";

/**
 * DECISIONS.md ADR-092. Server component wrapping the client pieces — `latest` is fetched
 * once by the Health page (getLatestMeasurement) and passed down, same pattern as
 * ActivityLogRow's sessions prop. The chart/log manage their own live data via useQuery;
 * `latest` only needs router.refresh() (not a query cache) to stay current after an add/delete.
 */
export function WeightCard({ latest, unit }: { latest: LatestMeasurement | null; unit: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weight</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {latest && (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <HeartPulse className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {latest.value} {latest.unit}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatDistanceToNow(new Date(latest.measuredAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        )}

        <WeightChart unit={unit} />
        <NewWeightForm unit={unit} />
        <WeightLog unit={unit} />
      </CardContent>
    </Card>
  );
}
