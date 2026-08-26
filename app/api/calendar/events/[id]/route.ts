import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { deleteEvent, updateManualEvent } from "@/lib/calendar/service";

const updateEventSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().nullable().optional(),
  allDay: z.boolean().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/calendar/events/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const event = await updateManualEvent(user.id, id, parsed.data);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/calendar/events/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  await deleteEvent(user.id, id);
  return new NextResponse(null, { status: 204 });
}
