import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createPlant, listAllPlants } from "@/lib/growing/service";
import { GROW_STAGES } from "@/lib/db/schema";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  // listAllPlants, not listPlants — /grow shows harvested plants too, same reasoning as
  // /pets showing retired pets (DECISIONS.md ADR-082). Today's check reminders stay
  // active-only (lib/today/service.ts uses listPlants directly).
  const plants = await listAllPlants(user.id);
  return NextResponse.json({ plants });
}

const createPlantSchema = z.object({
  strain: z.string().trim().min(1).max(100),
  datePlanted: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  stage: z.enum(GROW_STAGES).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = createPlantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const plant = await createPlant(user.id, parsed.data);
  return NextResponse.json({ plant }, { status: 201 });
}
