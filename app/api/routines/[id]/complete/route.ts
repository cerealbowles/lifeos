import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { completeRoutine } from "@/lib/tasks/service";

export async function POST(request: Request, ctx: RouteContext<"/api/routines/[id]/complete">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const routine = await completeRoutine(user.id, id, user.timezone);
  if (!routine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ routine });
}
