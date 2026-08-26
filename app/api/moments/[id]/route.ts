import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { deleteLogEntry } from "@/lib/moments/service";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/moments/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await deleteLogEntry(user.id, id);
  return new NextResponse(null, { status: 204 });
}
