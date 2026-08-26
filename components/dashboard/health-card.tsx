import { formatDistanceToNow } from "date-fns";
import { HeartPulse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LatestMeasurement } from "@/lib/today/service";

export function HealthCard({ measurement }: { measurement: LatestMeasurement | null }) {
  if (!measurement) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle href="/health">Health</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <HeartPulse className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium capitalize">
            {measurement.type}: {measurement.value} {measurement.unit}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatDistanceToNow(new Date(measurement.measuredAt), { addSuffix: true })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
