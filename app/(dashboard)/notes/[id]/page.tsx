import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getNote } from "@/lib/notes/service";
import { NoteEditor } from "@/components/notes/note-editor";

export default async function NoteDetailPage({ params }: PageProps<"/notes/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  const note = await getNote(user.id, id);
  if (!note) notFound();

  return (
    <NoteEditor
      note={{
        id: note.id,
        title: note.title,
        body: note.body,
        pinned: note.pinned,
        updatedAt: note.updatedAt.toISOString(),
      }}
    />
  );
}
