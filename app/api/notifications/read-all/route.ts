import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { markAllNotificationsRead } from "@/lib/notifications/service";

export async function POST() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markAllNotificationsRead(user.id);
  return new NextResponse(null, { status: 204 });
}
