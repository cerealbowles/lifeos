import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/guards";
import { requireUserOrWebhookToken } from "@/lib/auth/webhook";
import { createLogEntry, listLogEntries } from "@/lib/moments/service";
import { ImmichNotConnectedError } from "@/lib/immich/service";
import { ImmichError } from "@/lib/immich/client";
import type { MomentDTO } from "@/lib/moments/types";

export async function GET() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await listLogEntries(user.id);
  const moments: MomentDTO[] = entries.map((e) => ({
    id: e.id,
    caption: e.caption,
    location: e.location,
    occurredAt: e.occurredAt.toISOString(),
    imageUrl: `/api/moments/${e.id}/image`,
  }));
  return NextResponse.json({ moments });
}

/**
 * DECISIONS.md ADR-096 — the Moments equivalent of POST /api/workouts (ADR-095): accepts
 * either a browser session (the in-app manual-fallback form) or a bearer token
 * (`MOMENTS_WEBHOOK_TOKEN`), so an eventual iOS Shortcut — "share photo → LifeOS" — can post
 * directly without a real Share Extension. multipart/form-data because this carries an actual
 * file, not JSON like every other write endpoint in this app.
 */
export async function POST(request: Request) {
  const auth = await requireUserOrWebhookToken(request, "MOMENTS_WEBHOOK_TOKEN");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "A photo file is required" }, { status: 400 });
  }
  const caption = typeof form.get("caption") === "string" ? (form.get("caption") as string).trim() : undefined;
  const location = typeof form.get("location") === "string" ? (form.get("location") as string).trim() : undefined;
  const occurredAtRaw = form.get("occurredAt");
  const occurredAt = typeof occurredAtRaw === "string" && occurredAtRaw ? new Date(occurredAtRaw) : undefined;

  try {
    const entry = await createLogEntry(auth.user.id, {
      file,
      filename: file instanceof File ? file.name : "moment.jpg",
      caption: caption || undefined,
      location: location || undefined,
      occurredAt,
    });
    return NextResponse.json(
      {
        moment: {
          id: entry.id,
          caption: entry.caption,
          location: entry.location,
          occurredAt: entry.occurredAt.toISOString(),
          imageUrl: `/api/moments/${entry.id}/image`,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ImmichNotConnectedError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof ImmichError) return NextResponse.json({ error: err.message }, { status: 502 });
    throw err;
  }
}
