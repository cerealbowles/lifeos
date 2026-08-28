import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createNote, listNotes } from "@/lib/notes/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await listNotes(auth.user.id);
  return NextResponse.json({ notes });
}

const createNoteSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(50_000).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const note = await createNote(auth.user.id, parsed.data);
  return NextResponse.json({ note }, { status: 201 });
}
