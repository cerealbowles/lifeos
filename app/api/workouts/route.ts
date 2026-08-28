import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { requireUserOrWebhookToken } from "@/lib/auth/webhook";
import { createWorkout, listWorkouts } from "@/lib/workouts/service";
import type { User } from "@/lib/db/schema";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workouts = await listWorkouts(auth.user.id);
  return NextResponse.json({ workouts });
}

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const createWorkoutSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional(),
  // Optional — only the backfill form sends this (see components/health/log-past-workout-form.tsx).
  // "HH:MM" from a native <input type="time">, with an optional ":SS" for good measure.
  time: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time")
    .optional(),
  type: z.string().trim().min(1).max(50),
  durationMinutes: z.coerce.number().int().positive().max(1440),
  outdoor: z.boolean().optional(),
  note: z.string().trim().max(1000).optional(),
});

/**
 * DECISIONS.md ADR-095 — accepts three auth mechanisms: a session cookie, the LifeOS Android
 * app's own per-device bearer token (added alongside the app's native workout logging), or
 * the static `WORKOUT_WEBHOOK_TOKEN` for an external automation with no LifeOS login at all.
 * `date` defaults to today, since an automation firing right as a workout starts/ends has no
 * reason to compute and pass a date itself.
 */
export async function POST(request: Request) {
  const apiAuth = await requireUserOrApiToken(request);
  let user: User | null = apiAuth?.user ?? null;
  let source: string = apiAuth?.via ?? "session";
  if (!user) {
    const webhookAuth = await requireUserOrWebhookToken(request);
    user = webhookAuth?.user ?? null;
    source = webhookAuth?.via ?? source;
  }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createWorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const workout = await createWorkout(user.id, {
    ...parsed.data,
    date: parsed.data.date ?? todayDateString(),
    source,
  });
  return NextResponse.json({ workout }, { status: 201 });
}
