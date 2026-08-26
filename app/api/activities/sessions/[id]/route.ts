import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { completeSession, deleteSession } from "@/lib/activities/service";

export async function PATCH(_request: Request, ctx: RouteContext<"/api/activities/sessions/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const session = await completeSession(user.id, id);
  if (!session) return NextResponse.json({ error: "Session not found or already completed" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/activities/sessions/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await deleteSession(user.id, id);
  return new NextResponse(null, { status: 204 });
}
