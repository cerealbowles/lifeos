import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { deleteLogEntry } from "@/lib/moments/service";

export async function DELETE(request: Request, ctx: RouteContext<"/api/moments/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await deleteLogEntry(auth.user.id, id);
  return new NextResponse(null, { status: 204 });
}
