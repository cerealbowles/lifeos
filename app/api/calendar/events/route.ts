import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createManualEvent, listEvents } from "@/lib/calendar/service";
import { CalendarProviderError } from "@/lib/calendar/provider";

const AGENDA_PAST_DAYS = 7;
const AGENDA_FUTURE_DAYS = 60;

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const now = new Date();
  // Week/Month grid views (components/calendar/month-grid.tsx, week-grid.tsx) pass an
  // explicit range for the visible period; the flat Agenda view omits both and gets the
  // original fixed past/future window unchanged.
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const start = startParam ? new Date(startParam) : new Date(now.getTime() - AGENDA_PAST_DAYS * 24 * 60 * 60 * 1000);
  const end = endParam ? new Date(endParam) : new Date(now.getTime() + AGENDA_FUTURE_DAYS * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid start/end" }, { status: 400 });
  }

  try {
    const events = await listEvents(user.id, { start, end }, now);
    return NextResponse.json({ events });
  } catch (err) {
    if (err instanceof CalendarProviderError) {
      // A stale/revoked app-specific password shouldn't break the page — surface it as a
      // banner instead, and still return whatever's already cached.
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}

const createEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const event = await createManualEvent(user.id, parsed.data);
  return NextResponse.json({ event }, { status: 201 });
}
