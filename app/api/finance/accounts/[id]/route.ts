import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { deleteAccount } from "@/lib/finance/service";

export async function DELETE(request: Request, ctx: RouteContext<"/api/finance/accounts/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  await deleteAccount(user.id, id);
  return new NextResponse(null, { status: 204 });
}
