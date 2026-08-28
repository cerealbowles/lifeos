import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { deleteWorkout } from "@/lib/workouts/service";

export async function DELETE(request: Request, ctx: RouteContext<"/api/workouts/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await deleteWorkout(auth.user.id, id);
  return new NextResponse(null, { status: 204 });
}
