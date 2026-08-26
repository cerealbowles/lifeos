import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { deletePlantPhoto } from "@/lib/growing/service";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/grow/[id]/photos/[photoId]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, photoId } = await ctx.params;
  await deletePlantPhoto(user.id, id, photoId);
  return new NextResponse(null, { status: 204 });
}
