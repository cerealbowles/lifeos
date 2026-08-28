import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getPlantPhotoAsset } from "@/lib/growing/service";
import { ImmichError } from "@/lib/immich/client";

/** DECISIONS.md ADR-097 — same server-side proxy shape as /api/moments/[id]/image (ADR-096). */
export async function GET(request: Request, ctx: RouteContext<"/api/grow/[id]/photos/[photoId]/image">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, photoId } = await ctx.params;

  try {
    const asset = await getPlantPhotoAsset(auth.user.id, id, photoId);
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const immichRes = await asset.client.fetchPreview(asset.assetId);
    return new NextResponse(immichRes.body, {
      headers: {
        "Content-Type": immichRes.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (err) {
    if (err instanceof ImmichError) return NextResponse.json({ error: err.message }, { status: 502 });
    throw err;
  }
}
