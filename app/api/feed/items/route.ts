import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { getFeedCatchUp } from "@/lib/feed/service";

export async function GET() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catchUp = await getFeedCatchUp(user.id, user.feedLastViewedAt);
  return NextResponse.json(catchUp);
}
