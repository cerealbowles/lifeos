import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { markAllNotificationsRead } from "@/lib/notifications/service";

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markAllNotificationsRead(auth.user.id);
  return new NextResponse(null, { status: 204 });
}
