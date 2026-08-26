import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { removeFavoriteTeam } from "@/lib/sports/service";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/sports/teams/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await removeFavoriteTeam(user.id, id);
  return new NextResponse(null, { status: 204 });
}
