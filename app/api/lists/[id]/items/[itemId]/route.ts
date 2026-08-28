import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { removeListItem, setListItemChecked } from "@/lib/lists/service";

const patchSchema = z.object({ checked: z.boolean() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/lists/[id]/items/[itemId]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Only { checked: boolean } is supported right now" }, { status: 400 });
  }

  const { itemId } = await ctx.params;
  const item = await setListItemChecked(auth.user.id, itemId, parsed.data.checked);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ item });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/lists/[id]/items/[itemId]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await ctx.params;
  await removeListItem(auth.user.id, itemId);
  return new NextResponse(null, { status: 204 });
}
