import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { retirePet, updatePet } from "@/lib/pets/service";

const updatePetSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  species: z.string().trim().min(1).max(100).optional(),
  breed: z.string().trim().max(100).nullable().optional(),
  birthDate: z.string().trim().nullable().optional(),
  // Lets the "Restore" button in the UI un-retire a pet via the same PATCH endpoint, rather
  // than needing a separate route — see lib/pets/service.ts's updatePet/unretirePet.
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/pets/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updatePetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const pet = await updatePet(user.id, id, parsed.data);
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  return NextResponse.json({ pet });
}

/**
 * "Retire," not delete — see lib/pets/service.ts's retirePet. The pet stays visible in
 * /pets, just marked inactive.
 */
export async function DELETE(request: Request, ctx: RouteContext<"/api/pets/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  await retirePet(user.id, id);
  return new NextResponse(null, { status: 204 });
}
