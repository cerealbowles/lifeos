import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { removeFeedSubscription } from "@/lib/feed/service";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/feed/subscriptions/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await removeFeedSubscription(user.id, id);
  return new NextResponse(null, { status: 204 });
}
