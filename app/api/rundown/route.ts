import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getDailyRundown } from "@/lib/today/rundown-service";

/**
 * Same auth pattern as /api/today and /api/weather (session cookie or per-device Bearer
 * token). Returns the tone-shifting Daily Rundown narrative for the Android Home screen.
 */
export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rundown = await getDailyRundown(auth.user);
  return NextResponse.json(rundown);
}
