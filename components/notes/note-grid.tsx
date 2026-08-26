"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { NoteDTO } from "@/lib/notes/types";

function snippet(body: string) {
  const trimmed = body.trim();
  if (!trimmed) return "Empty note";
  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
}

export function NoteGrid() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: () => apiFetch<{ notes: NoteDTO[] }>("/api/notes"),
  });

  const createNote = useMutation<{ note: NoteDTO }, ApiError>({
    mutationFn: () => apiFetch<{ note: NoteDTO }>("/api/notes", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: ({ note }) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      router.push(`/notes/${note.id}`);
    },
  });

  const notes = data?.notes ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notes</h1>
        <Button type="button" size="sm" disabled={createNote.isPending} onClick={() => createNote.mutate()}>
          <Plus className="h-4 w-4" />
          New note
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-400">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-neutral-400">No notes yet. Create one above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {notes.map((note) => (
            <Link key={note.id} href={`/notes/${note.id}`}>
              <Card className="h-full transition-colors hover:border-neutral-400 dark:hover:border-neutral-600">
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <div className="flex items-center gap-1.5">
                    {note.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-neutral-400" fill="currentColor" />}
                    <CardTitle className="text-sm normal-case tracking-normal text-neutral-900 dark:text-neutral-100">
                      {note.title || "Untitled note"}
                    </CardTitle>
                  </div>
                  <p className="line-clamp-4 text-xs text-neutral-500 dark:text-neutral-400">{snippet(note.body)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
