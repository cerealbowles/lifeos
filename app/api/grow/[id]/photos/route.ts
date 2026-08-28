import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { addPlantPhoto, listPlantPhotos, PlantAlbumNotSetError } from "@/lib/growing/service";
import { ImmichNotConnectedError } from "@/lib/immich/service";
import { ImmichError } from "@/lib/immich/client";
import type { GrowPlantPhotoDTO } from "@/lib/growing/types";

export async function GET(request: Request, ctx: RouteContext<"/api/grow/[id]/photos">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const photos = await listPlantPhotos(auth.user.id, id);
  const dtos: GrowPlantPhotoDTO[] = photos.map((p) => ({
    id: p.id,
    caption: p.caption,
    takenAt: p.takenAt.toISOString(),
    imageUrl: `/api/grow/${id}/photos/${p.id}/image`,
  }));
  return NextResponse.json({ photos: dtos });
}

/**
 * DECISIONS.md ADR-097 — the Grow equivalent of POST /api/moments (ADR-096), scoped to one
 * plant's own Immich album instead of the shared Moments album. Session-only (no webhook
 * dual-auth like Moments/Workouts) — this is manual in-app capture only, no automation was
 * asked for here.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/grow/[id]/photos">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "A photo file is required" }, { status: 400 });
  }
  const caption = typeof form.get("caption") === "string" ? (form.get("caption") as string).trim() : undefined;

  try {
    const photo = await addPlantPhoto(auth.user.id, id, {
      file,
      filename: file instanceof File ? file.name : "plant-photo.jpg",
      caption: caption || undefined,
    });
    if (!photo) return NextResponse.json({ error: "Plant not found" }, { status: 404 });

    return NextResponse.json(
      {
        photo: {
          id: photo.id,
          caption: photo.caption,
          takenAt: photo.takenAt.toISOString(),
          imageUrl: `/api/grow/${id}/photos/${photo.id}/image`,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof PlantAlbumNotSetError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof ImmichNotConnectedError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof ImmichError) return NextResponse.json({ error: err.message }, { status: 502 });
    throw err;
  }
}
