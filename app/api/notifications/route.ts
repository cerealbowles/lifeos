import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { getUnreadCount, listNotifications } from "@/lib/notifications/service";

export async function GET() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([listNotifications(user.id), getUnreadCount(user.id)]);
  return NextResponse.json({ notifications, unreadCount });
}
