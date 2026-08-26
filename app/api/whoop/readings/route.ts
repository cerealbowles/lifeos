import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrWebhookToken } from "@/lib/auth/webhook";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { addWhoopReadings, getLatestWhoopReadings } from "@/lib/whoop/service";
import { recordSleepSegments } from "@/lib/sleep/service";
import { SLEEP_STAGES } from "@/lib/db/schema";

/**
 * Latest-per-type Whoop readings for the native app's Health tab — session or per-device
 * bearer token (the phone reading its own account's data), deliberately NOT the webhook
 * token POST uses below (that's a write credential for one automation, the companion app;
 * this is a read for whichever LifeOS client is signed in as the actual user).
 */
export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const readings = await getLatestWhoopReadings(auth.user.id);
  return NextResponse.json({ readings });
}

const readingSchema = z.object({
  type: z.string().trim().min(1).max(50),
  value: z.coerce.number(),
  unit: z.string().trim().min(1).max(20),
  measuredAt: z.coerce.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const sleepSegmentSchema = z.object({
  stage: z.enum(SLEEP_STAGES),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
});

// `readings` alone used to be required (min 1) — widened to allow a sync batch that's
// entirely sleep segments (e.g. a night with no fresh HR/HRV window to derive) without
// forcing the phone to invent a dummy reading just to satisfy this schema.
const postSchema = z
  .object({
    readings: z.array(readingSchema).max(1000).default([]),
    sleepSegments: z.array(sleepSegmentSchema).max(10000).default([]),
  })
  .refine((data) => data.readings.length > 0 || data.sleepSegments.length > 0, {
    message: "At least one reading or sleep segment is required",
  });

/**
 * Same dual-auth shape as POST /api/workouts (lib/auth/webhook.ts) — the mobile/whoop-bridge
 * companion app authenticates with WHOOP_WEBHOOK_TOKEN since it can't hold a browser session.
 * Accepts a batch, not one reading at a time: a historical BLE offload after a pairing gap
 * can be hundreds of records synced in one pass. `sleepSegments` rides in the same batch
 * (not a separate endpoint) since it's the same sync call uploading both — see
 * lib/sleep/service.ts's recordSleepSegments for how segments become sessions server-side.
 */
export async function POST(request: Request) {
  const auth = await requireUserOrWebhookToken(request, "WHOOP_WEBHOOK_TOKEN");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const readings = parsed.data.readings.length > 0 ? await addWhoopReadings(auth.user.id, parsed.data.readings) : [];
  if (parsed.data.sleepSegments.length > 0) {
    await recordSleepSegments(auth.user.id, parsed.data.sleepSegments);
  }
  return NextResponse.json({ readings }, { status: 201 });
}
