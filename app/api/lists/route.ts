import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createList, listLists } from "@/lib/lists/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lists = await listLists(auth.user.id);
  return NextResponse.json({ lists });
}

const createListSchema = z.object({
  name: z.string().trim().min(1).max(200),
  listType: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const list = await createList(auth.user.id, parsed.data.name, parsed.data.listType);
  return NextResponse.json({ list }, { status: 201 });
}
