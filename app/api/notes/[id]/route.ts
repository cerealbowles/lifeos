import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { archiveNote, getNote, updateNote } from "@/lib/notes/service";

export async function GET(request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const note = await getNote(auth.user.id, id);
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json({ note });
}

const updateNoteSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(50_000).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const note = await updateNote(auth.user.id, id, parsed.data);
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json({ note });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await archiveNote(auth.user.id, id);
  return new NextResponse(null, { status: 204 });
}
