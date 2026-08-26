import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getTodayOverview } from "@/lib/today/service";

/**
 * Session cookie (web app, unchanged) or a per-device Bearer token (mobile/lifeos-android,
 * lib/auth/api-token.ts) — the one route touched for the native app's v1 scope.
 */
export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const overview = await getTodayOverview(auth.user);
  return NextResponse.json(overview);
}
