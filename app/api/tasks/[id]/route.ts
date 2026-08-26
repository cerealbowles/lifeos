import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { completeTask, deleteTask } from "@/lib/tasks/service";

const patchSchema = z.object({ status: z.literal("done") });

export async function PATCH(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Only { status: 'done' } is supported right now" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const task = await completeTask(user.id, id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ task });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  await deleteTask(user.id, id);
  return new NextResponse(null, { status: 204 });
}
