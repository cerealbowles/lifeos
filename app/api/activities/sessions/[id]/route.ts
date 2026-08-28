import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { completeSession, deleteSession } from "@/lib/activities/service";

export async function PATCH(request: Request, ctx: RouteContext<"/api/activities/sessions/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const session = await completeSession(auth.user.id, id);
  if (!session) return NextResponse.json({ error: "Session not found or already completed" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/activities/sessions/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await deleteSession(auth.user.id, id);
  return new NextResponse(null, { status: 204 });
}
