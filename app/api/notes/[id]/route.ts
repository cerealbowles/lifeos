import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { archiveNote, getNote, updateNote } from "@/lib/notes/service";

export async function GET(_request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const note = await getNote(user.id, id);
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json({ note });
}

const updateNoteSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(50_000).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const note = await updateNote(user.id, id, parsed.data);
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json({ note });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await archiveNote(user.id, id);
  return new NextResponse(null, { status: 204 });
}
