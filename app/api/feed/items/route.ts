import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getFeedCatchUp } from "@/lib/feed/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catchUp = await getFeedCatchUp(auth.user.id, auth.user.feedLastViewedAt);
  return NextResponse.json(catchUp);
}
