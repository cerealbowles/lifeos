import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getActiveSession, getOrStartActiveSession, listRecentSessions } from "@/lib/activities/service";
import { ACTIVITY_TYPES } from "@/lib/db/schema";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [activeSession, sessions] = await Promise.all([getActiveSession(auth.user.id), listRecentSessions(auth.user.id)]);
  return NextResponse.json({ activeSession, sessions });
}

const startSessionSchema = z.object({
  activityType: z.enum(ACTIVITY_TYPES).default("stretching"),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = startSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const session = await getOrStartActiveSession(auth.user.id, parsed.data.activityType);
  return NextResponse.json({ session }, { status: 201 });
}
