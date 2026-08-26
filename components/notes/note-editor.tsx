"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pin, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { NoteDTO } from "@/lib/notes/types";

const AUTOSAVE_DELAY_MS = 800;

/**
 * Autosaves title/body on a debounce instead of an explicit Save button — matches the
 * "manual notes, no ceremony" scope from ROADMAP.md's Notes pick. Pin/delete stay explicit
 * actions since they're structural, not content edits.
 */
export function NoteEditor({ note }: { note: NoteDTO }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation<{ note: NoteDTO }, ApiError, { title: string; body: string }>({
    mutationFn: (input) =>
      apiFetch<{ note: NoteDTO }>(`/api/notes/${note.id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      setStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function queueSave(next: { title: string; body: string }) {
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save.mutate(next), AUTOSAVE_DELAY_MS);
  }

  const togglePinned = useMutation<{ note: NoteDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ note: NoteDTO }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pinned: !note.pinned }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      router.refresh();
    },
  });

  const remove = useMutation<unknown, ApiError>({
    mutationFn: () => apiFetch(`/api/notes/${note.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      router.push("/notes");
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            queueSave({ title: e.target.value, body });
          }}
          placeholder="Untitled note"
          className="border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 text-xs text-neutral-400">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
            disabled={togglePinned.isPending}
            onClick={() => togglePinned.mutate()}
          >
            <Pin
              className={cn("h-4 w-4", note.pinned ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-400")}
              fill={note.pinned ? "currentColor" : "none"}
            />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Delete note" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4 text-neutral-400" />
          </Button>
        </div>
      </div>

      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <p className="text-neutral-600 dark:text-neutral-300">Delete this note?</p>
          <Button type="button" variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Delete
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      )}

      <Textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          queueSave({ title, body: e.target.value });
        }}
        placeholder="Write something…"
        rows={16}
        className="border-none px-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
