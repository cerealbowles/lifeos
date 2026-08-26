import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LatestWhoopReadings } from "@/lib/whoop/service";

const LABELS: Record<string, string> = {
  recovery_score: "Recovery",
  strain: "Strain",
  hrv: "HRV",
  heart_rate: "Heart rate",
  spo2: "SpO2",
  skin_temp: "Skin temp",
  sleep_performance: "Sleep",
};

// Fixed display order regardless of which types happen to have data yet.
const DISPLAY_ORDER = ["recovery_score", "strain", "sleep_performance", "hrv", "heart_rate", "spo2", "skin_temp"];

/**
 * `measurements.value` is Postgres `numeric`, returned as a string preserving whatever
 * precision was written — found live: the companion app's RMSSD HRV calc writes full
 * float precision ("299.54346214578896 ms"), unrounded before display. Defensive
 * formatting here fixes already-stored values immediately (no re-sync needed), on top
 * of rounding at the source (see mobile/whoop-bridge's Derive.kt).
 */
function formatValue(raw: string): string {
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/**
 * Companion app: mobile/whoop-bridge (pairs directly with a Whoop strap over BLE, no Whoop
 * subscription/cloud — see DECISIONS.md). No chart/history in v1, unlike WeightCard — just
 * latest-per-type, since the real data shape wasn't known until the companion app existed.
 * Suppresses itself down to a single explanatory line until the first sync ever lands
 * (DECISIONS.md: avoid a permanent empty card for a domain with nothing to show yet).
 */
export function WhoopCard({ latest }: { latest: LatestWhoopReadings }) {
  const entries = DISPLAY_ORDER.filter((type) => latest[type]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Whoop</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Not connected yet — pair the mobile/whoop-bridge companion app with your strap to start syncing.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {entries.map((type) => {
              const reading = latest[type];
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <Activity className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {formatValue(reading.value)} {reading.unit}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{LABELS[type] ?? type}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {formatDistanceToNow(new Date(reading.measuredAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
