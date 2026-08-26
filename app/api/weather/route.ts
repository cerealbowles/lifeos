import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getCurrentWeather } from "@/lib/weather/service";

/**
 * JSON wrapper around getCurrentWeather — the web dashboard calls that service function
 * directly from a Server Component (app/(dashboard)/page.tsx), so no REST endpoint existed
 * for it before now. Added for the native app's Today screen, which needs the same "surfaced
 * only when connected" weather summary the web dashboard shows. Returns `{ weather: null }`
 * (not a 404/error) when the user hasn't connected a weather provider — matches WeatherCard's
 * own `if (!weather) return null` self-suppression, not a failure state.
 */
export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const units = auth.user.unitsSystem === "imperial" ? "imperial" : "metric";
  const weather = await getCurrentWeather(auth.user.id, units);
  return NextResponse.json({ weather });
}
