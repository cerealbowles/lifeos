import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { checkInPlant, listPlantCheckIns } from "@/lib/growing/service";
import { GROW_STAGES, TRICHOME_STATUSES } from "@/lib/db/schema";
import type { GrowPlantCheckInDTO } from "@/lib/growing/types";

const checkInSchema = z.object({
  stage: z.enum(GROW_STAGES).optional(),
  trichomeStatus: z.enum(TRICHOME_STATUSES).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

/** Check-in history for this plant, most recent first — see PlantCheckIns. */
export async function GET(request: Request, ctx: RouteContext<"/api/grow/[id]/check-in">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const checkIns = await listPlantCheckIns(user.id, id);
  const dtos: GrowPlantCheckInDTO[] = checkIns.map((c) => ({
    id: c.id,
    stage: c.stage,
    trichomeStatus: c.trichomeStatus,
    notes: c.notes,
    checkedAt: c.checkedAt.toISOString(),
  }));
  return NextResponse.json({ checkIns: dtos });
}

export async function POST(request: Request, ctx: RouteContext<"/api/grow/[id]/check-in">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const plant = await checkInPlant(user.id, id, parsed.data);
  if (!plant) return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  return NextResponse.json({ plant });
}
