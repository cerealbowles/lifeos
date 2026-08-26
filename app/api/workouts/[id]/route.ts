import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { deleteWorkout } from "@/lib/workouts/service";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/workouts/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await deleteWorkout(user.id, id);
  return new NextResponse(null, { status: 204 });
}
