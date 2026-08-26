import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { listSleepSessions } from "@/lib/sleep/service";
import { MEASUREMENT_RANGES, type MeasurementRange } from "@/lib/measurements/range";

/** Recent sleep sessions for the Health page's sleep log — session or per-device token. */
export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "30d";
  const range: MeasurementRange = MEASUREMENT_RANGES.includes(rangeParam as MeasurementRange)
    ? (rangeParam as MeasurementRange)
    : "30d";

  const sessions = await listSleepSessions(auth.user.id, range);
  return NextResponse.json({ sessions });
}
