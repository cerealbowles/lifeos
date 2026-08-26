import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { deleteChallenge, getChallengeDetail, updateChallenge } from "@/lib/challenges/service";
import { CHALLENGE_STATUSES } from "@/lib/db/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/challenges/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const detail = await getChallengeDetail(user.id, id, new Date(), user.timezone);
  if (!detail) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });

  // Set isn't JSON-serializable — flatten to an array of "habitId:date" keys, same shape
  // the client rebuilds into a Set for its own O(1) lookups.
  return NextResponse.json({ ...detail, completedSet: [...detail.completedSet] });
}

const updateChallengeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  status: z.enum(CHALLENGE_STATUSES).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/challenges/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const challenge = await updateChallenge(user.id, id, parsed.data);
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  return NextResponse.json({ challenge });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/challenges/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await deleteChallenge(user.id, id);
  return new NextResponse(null, { status: 204 });
}
