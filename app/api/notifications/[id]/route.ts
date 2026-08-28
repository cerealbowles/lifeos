import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { markNotificationRead } from "@/lib/notifications/service";

export async function PATCH(request: Request, ctx: RouteContext<"/api/notifications/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const notification = await markNotificationRead(auth.user.id, id);
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ notification });
}
