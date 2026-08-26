import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { createNote, listNotes } from "@/lib/notes/service";

export async function GET() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await listNotes(user.id);
  return NextResponse.json({ notes });
}

const createNoteSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(50_000).optional(),
});

export async function POST(request: Request) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const note = await createNote(user.id, parsed.data);
  return NextResponse.json({ note }, { status: 201 });
}
