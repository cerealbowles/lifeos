import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { toggleCompletion } from "@/lib/challenges/service";

const toggleSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export async function POST(request: Request, ctx: RouteContext<"/api/challenges/[id]/completions">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const result = await toggleCompletion(auth.user.id, id, parsed.data.habitId, parsed.data.date);
  return NextResponse.json(result);
}
