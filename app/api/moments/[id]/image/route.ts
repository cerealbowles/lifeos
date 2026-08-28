import { NextResponse } from "next/server";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { getLogEntryAsset } from "@/lib/moments/service";
import { ImmichError } from "@/lib/immich/client";

/**
 * DECISIONS.md ADR-096. The browser never talks to Immich directly or holds its API key —
 * this route fetches a display-quality preview image server-side (with the key attached) and
 * streams it back. Cached for a day since a given asset's image never changes once uploaded.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/moments/[id]/image">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const asset = await getLogEntryAsset(auth.user.id, id);
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
