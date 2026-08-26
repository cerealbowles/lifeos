import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { deleteMeasurement } from "@/lib/measurements/service";

export async function DELETE(request: Request, ctx: RouteContext<"/api/measurements/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  await deleteMeasurement(user.id, id);
  return new NextResponse(null, { status: 204 });
}
