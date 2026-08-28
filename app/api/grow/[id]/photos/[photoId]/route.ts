import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { deletePlantPhoto } from "@/lib/growing/service";

export async function DELETE(request: Request, ctx: RouteContext<"/api/grow/[id]/photos/[photoId]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, photoId } = await ctx.params;
  await deletePlantPhoto(auth.user.id, id, photoId);
  return new NextResponse(null, { status: 204 });
}
