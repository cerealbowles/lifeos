import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { addHabit } from "@/lib/challenges/service";

const addHabitSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export async function POST(request: Request, ctx: RouteContext<"/api/challenges/[id]/habits">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = addHabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const habit = await addHabit(user.id, id, parsed.data.title);
  return NextResponse.json({ habit }, { status: 201 });
}
