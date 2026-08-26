import { MeasurementTrendChart } from "./measurement-trend-chart";

/**
 * DECISIONS.md ADR-092. Thin wrapper around the generalized MeasurementTrendChart
 * (extracted from what used to be this file's own full implementation) — behavior for
 * weight is unchanged, just no longer duplicated for heart_rate/hrv.
 */
export function WeightChart({ unit }: { unit: string }) {
  return <MeasurementTrendChart type="weight" unit={unit} />;
}
