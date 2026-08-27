import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getBoxscore } from "@/lib/sports/service";
import { BettingApiError } from "@/lib/sports/betting-client";

export async function GET(request: Request, ctx: RouteContext<"/api/sports/games/mlb/[gamePk]/boxscore">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gamePk } = await ctx.params;
  const pk = Number(gamePk);
  if (!Number.isInteger(pk)) return NextResponse.json({ error: "Invalid game" }, { status: 400 });

  try {
    const box = await getBoxscore(pk);
    if (!box) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(box);
  } catch (err) {
    if (err instanceof BettingApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
