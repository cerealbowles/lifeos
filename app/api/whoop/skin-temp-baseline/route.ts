import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getSkinTempBaseline } from "@/lib/whoop/service";

/** Latest skin temp vs. rolling personal baseline, for the Health page's anomaly card. */
export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const baseline = await getSkinTempBaseline(auth.user.id);
  return NextResponse.json(baseline);
}
