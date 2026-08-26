import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { deletePlant, getPlant, updatePlant } from "@/lib/growing/service";
import { parseImmichAlbumId } from "@/lib/immich/album-url";
import { GROW_STAGES, TRICHOME_STATUSES } from "@/lib/db/schema";

export async function GET(request: Request, ctx: RouteContext<"/api/grow/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const plant = await getPlant(user.id, id);
  if (!plant) return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  return NextResponse.json({ plant });
}

const updatePlantSchema = z.object({
  strain: z.string().trim().min(1).max(100).optional(),
  stage: z.enum(GROW_STAGES).optional(),
  trichomeStatus: z.enum(TRICHOME_STATUSES).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  // Lets the /grow "Restore" action un-harvest a plant via this same endpoint, matching
  // pets' active toggle (DECISIONS.md ADR-082).
  active: z.boolean().optional(),
  // DECISIONS.md ADR-097 — accepts a bare album id or a pasted Immich share URL; parsed below.
  immichAlbumId: z.string().trim().nullable().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/grow/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updatePlantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  let immichAlbumId: string | null | undefined;
  if (parsed.data.immichAlbumId !== undefined) {
    if (!parsed.data.immichAlbumId) {
      immichAlbumId = null; // Empty string/null clears it.
    } else {
      immichAlbumId = parseImmichAlbumId(parsed.data.immichAlbumId);
      if (!immichAlbumId) {
        return NextResponse.json({ error: "Enter a valid Immich album id or share URL" }, { status: 400 });
      }
    }
  }

  const plant = await updatePlant(user.id, id, { ...parsed.data, immichAlbumId });
  if (!plant) return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  return NextResponse.json({ plant });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/grow/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  await deletePlant(user.id, id);
  return new NextResponse(null, { status: 204 });
}
