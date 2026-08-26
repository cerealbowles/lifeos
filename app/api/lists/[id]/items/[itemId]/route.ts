import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { removeListItem, setListItemChecked } from "@/lib/lists/service";

const patchSchema = z.object({ checked: z.boolean() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/lists/[id]/items/[itemId]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Only { checked: boolean } is supported right now" }, { status: 400 });
  }

  const { itemId } = await ctx.params;
  const item = await setListItemChecked(user.id, itemId, parsed.data.checked);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/lists/[id]/items/[itemId]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await ctx.params;
  await removeListItem(user.id, itemId);
  return new NextResponse(null, { status: 204 });
}
