import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getSleepSessionDetail } from "@/lib/sleep/service";

/** One sleep session + its ordered stage segments — feeds the hypnogram view. */
export async function GET(request: Request, ctx: RouteContext<"/api/sleep/sessions/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const detail = await getSleepSessionDetail(auth.user.id, id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}
