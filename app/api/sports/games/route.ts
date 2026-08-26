import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getGamesGrouped, BettingApiError } from "@/lib/sports/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await getGamesGrouped(auth.user.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BettingApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
