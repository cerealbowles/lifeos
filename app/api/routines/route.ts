import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createRoutine, listRoutines } from "@/lib/tasks/service";
import { RECURRENCE_TYPES } from "@/lib/db/schema";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const routines = await listRoutines(user.id);
  return NextResponse.json({ routines });
}

// Exported so app/api/routines/[id]/route.ts's PATCH can validate an updated recurrenceConfig
// with the exact same rules, rather than duplicating this union.
export const recurrenceConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("interval"), days: z.number().int().positive() }),
  z.object({ type: z.literal("weekly"), daysOfWeek: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("monthly_day"), day: z.number().int().min(1).max(31) }),
]);

const createRoutineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(100).optional(),
  recurrenceType: z.enum(RECURRENCE_TYPES),
  recurrenceConfig: recurrenceConfigSchema,
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = createRoutineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (parsed.data.recurrenceType !== parsed.data.recurrenceConfig.type) {
    return NextResponse.json({ error: "recurrenceType must match recurrenceConfig.type" }, { status: 400 });
  }

  const routine = await createRoutine(user.id, { ...parsed.data, timezone: user.timezone });
  return NextResponse.json({ routine }, { status: 201 });
}
