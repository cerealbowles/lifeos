import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createPet, listAllPets } from "@/lib/pets/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  // listAllPets, not listPets — the /pets grid shows retired pets too (marked inactive),
  // unlike Today/the AI agent, which only care about active pets.
  const pets = await listAllPets(user.id);
  return NextResponse.json({ pets });
}

const createPetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  species: z.string().trim().min(1).max(100),
  breed: z.string().trim().max(100).optional(),
  birthDate: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = createPetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const pet = await createPet(user.id, parsed.data);
  return NextResponse.json({ pet }, { status: 201 });
}
