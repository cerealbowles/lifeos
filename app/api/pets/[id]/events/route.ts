import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createPetEvent, listPetEvents } from "@/lib/pets/service";
import { PET_EVENT_TYPES } from "@/lib/db/schema";

export async function GET(request: Request, ctx: RouteContext<"/api/pets/[id]/events">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const events = await listPetEvents(user.id, id);
  return NextResponse.json({ events });
}

const recurrenceConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("interval"), days: z.number().int().positive() }),
  z.object({ type: z.literal("weekly"), daysOfWeek: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("monthly_day"), day: z.number().int().min(1).max(31) }),
]);

const createEventSchema = z.object({
  eventType: z.enum(PET_EVENT_TYPES),
  title: z.string().trim().min(1).max(200),
  scheduledAt: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
  recurrenceRule: recurrenceConfigSchema.optional(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/pets/[id]/events">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const event = await createPetEvent(user.id, id, {
    ...parsed.data,
    recurrenceRule: parsed.data.recurrenceRule ?? null,
  });
  return NextResponse.json({ event }, { status: 201 });
}
