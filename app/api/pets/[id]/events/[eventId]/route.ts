import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { completePetEvent, deletePetEvent } from "@/lib/pets/service";

const patchSchema = z.object({ completed: z.literal(true) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/pets/[id]/events/[eventId]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Only { completed: true } is supported right now" }, { status: 400 });
  }

  const { eventId } = await ctx.params;
  const event = await completePetEvent(user.id, eventId, user.timezone);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/pets/[id]/events/[eventId]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { eventId } = await ctx.params;
  await deletePetEvent(user.id, eventId);
  return new NextResponse(null, { status: 204 });
}
