import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { getVapidPublicKey } from "@/lib/notifications/push";

export async function GET() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ publicKey: getVapidPublicKey() });
}
