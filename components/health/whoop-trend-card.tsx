import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeasurementTrendChart } from "./measurement-trend-chart";

/**
 * Heart rate/HRV trend, reusing MeasurementTrendChart exactly like WeightChart does —
 * both types already flow into `measurements` with `source: "whoop"` (mobile/whoop-bridge's
 * DailyDerive), so no new data plumbing was needed, just a chart pointed at them. Windowed
 * to the last 30 minutes ("just show ... for now") rather than weight's 90d default —
 * Whoop readings are dense (roughly one per successful sync, at most every ~15 min), so a
 * day/month range is mostly noise for "what's it doing right now."
 */
export function WhoopTrendCard({ title, type, unit }: { title: string; type: string; unit: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} (last 30 min)</CardTitle>
      </CardHeader>
      <CardContent>
        <MeasurementTrendChart type={type} unit={unit} windowMinutes={30} emptyLabel="No readings in the last 30 min" />
      </CardContent>
    </Card>
  );
}
