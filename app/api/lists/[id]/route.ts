import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { archiveList, renameList } from "@/lib/lists/service";

const renameListSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/lists/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = renameListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const list = await renameList(user.id, id, parsed.data.name);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
  return NextResponse.json({ list });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/lists/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await archiveList(user.id, id);
  return new NextResponse(null, { status: 204 });
}
