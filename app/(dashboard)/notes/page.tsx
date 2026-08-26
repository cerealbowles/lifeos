import { requireUser } from "@/lib/auth/guards";
import { NoteGrid } from "@/components/notes/note-grid";

export default async function NotesPage() {
  await requireUser();

  return <NoteGrid />;
}
