import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createChallenge, listChallenges } from "@/lib/challenges/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await listChallenges(auth.user.id);
  return NextResponse.json({ challenges });
}

const createChallengeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  durationDays: z.coerce.number().int().min(1).max(3650),
  habitTitles: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const result = await createChallenge(auth.user.id, parsed.data);
  return NextResponse.json(result, { status: 201 });
}
