import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { addListItem, getListWithItems } from "@/lib/lists/service";

export async function GET(request: Request, ctx: RouteContext<"/api/lists/[id]/items">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await getListWithItems(auth.user.id, id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ items: result.items });
}

const addItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.string().trim().max(50).optional(),
  unit: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/lists/[id]/items">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await getListWithItems(auth.user.id, id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const item = await addListItem(auth.user.id, id, parsed.data);
  return NextResponse.json({ item }, { status: 201 });
}
