import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { removeHabit } from "@/lib/challenges/service";

export async function DELETE(request: Request, ctx: RouteContext<"/api/challenges/[id]/habits/[habitId]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId } = await ctx.params;
  await removeHabit(auth.user.id, habitId);
  return new NextResponse(null, { status: 204 });
}
