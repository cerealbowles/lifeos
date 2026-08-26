import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { removeHabit } from "@/lib/challenges/service";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/challenges/[id]/habits/[habitId]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId } = await ctx.params;
  await removeHabit(user.id, habitId);
  return new NextResponse(null, { status: 204 });
}
