import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { markNotificationRead } from "@/lib/notifications/service";

export async function PATCH(_request: Request, ctx: RouteContext<"/api/notifications/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const notification = await markNotificationRead(user.id, id);
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ notification });
}
