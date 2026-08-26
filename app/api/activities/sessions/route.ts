import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { getActiveSession, getOrStartActiveSession, listRecentSessions } from "@/lib/activities/service";
import { ACTIVITY_TYPES } from "@/lib/db/schema";

export async function GET() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [activeSession, sessions] = await Promise.all([getActiveSession(user.id), listRecentSessions(user.id)]);
  return NextResponse.json({ activeSession, sessions });
}

const startSessionSchema = z.object({
  activityType: z.enum(ACTIVITY_TYPES).default("stretching"),
});

export async function POST(request: Request) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = startSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const session = await getOrStartActiveSession(user.id, parsed.data.activityType);
  return NextResponse.json({ session }, { status: 201 });
}
