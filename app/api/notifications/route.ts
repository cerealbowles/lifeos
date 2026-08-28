import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getUnreadCount, listNotifications } from "@/lib/notifications/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([listNotifications(auth.user.id), getUnreadCount(auth.user.id)]);
  return NextResponse.json({ notifications, unreadCount });
}
