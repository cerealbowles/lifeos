import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { updateRoutine } from "@/lib/tasks/service";
import { RECURRENCE_TYPES } from "@/lib/db/schema";
import { recurrenceConfigSchema } from "../route";

const updateRoutineSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(100).optional(),
  recurrenceType: z.enum(RECURRENCE_TYPES).optional(),
  recurrenceConfig: recurrenceConfigSchema.optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateRoutineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (
    parsed.data.recurrenceType !== undefined &&
    parsed.data.recurrenceConfig !== undefined &&
    parsed.data.recurrenceType !== parsed.data.recurrenceConfig.type
  ) {
    return NextResponse.json({ error: "recurrenceType must match recurrenceConfig.type" }, { status: 400 });
  }

  const routine = await updateRoutine(user.id, id, parsed.data, user.timezone);
  if (!routine) return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  return NextResponse.json({ routine });
}
