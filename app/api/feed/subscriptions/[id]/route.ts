import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { removeFeedSubscription } from "@/lib/feed/service";

export async function DELETE(request: Request, ctx: RouteContext<"/api/feed/subscriptions/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await removeFeedSubscription(auth.user.id, id);
  return new NextResponse(null, { status: 204 });
}
