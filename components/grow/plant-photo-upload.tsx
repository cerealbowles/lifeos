"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * DECISIONS.md ADR-097 — the Grow equivalent of components/moments/new-moment-form.tsx,
 * uploading into this specific plant's Immich album instead of the shared Moments album. Not
 * a shared/generalized component with NewMomentForm: per CLAUDE.md's "avoid excessive
 * abstraction," two call sites doesn't yet justify extracting a generic upload-form
 * abstraction, and the two forms already differ (no location field here, different upload
 * endpoint, different query key) — copy-adapted, not shared.
 *
 * The file input is visually hidden and triggered by a real "Take Photo" button instead of
 * relying on the browser's default file-input styling — `capture="environment"` was already
 * set (it's what opens the device camera directly on mobile instead of a generic file picker)
 * but a bare, browser-styled file input doesn't read as "tap to take a photo," which was the
 * actual point of confusion this fixes.
 */
export function PlantPhotoUpload({ plantId }: { plantId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  const mutation = useMutation<void, ApiError>({
    mutationFn: async () => {
      if (!file) throw new ApiError("Take a photo first.", 400);
      const form = new FormData();
      form.set("file", file);
      if (caption.trim()) form.set("caption", caption.trim());

      const res = await fetch(`/api/grow/${plantId}/photos`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(body?.error ?? `Request failed with ${res.status}`, res.status);
      }
    },
    onSuccess: () => {
      setFile(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["grow-plant-photos", plantId] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) return;
        mutation.mutate();
      }}
      className="flex flex-col gap-2"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => fileInputRef.current?.click()}>
        <Camera className="h-4 w-4" />
        {file ? file.name : "Take photo"}
      </Button>
      {file && (
        <div className="flex items-center gap-2">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? "Posting…" : "Post"}
          </Button>
        </div>
      )}
      {mutation.isError && <p className="text-xs text-red-600 dark:text-red-400">{mutation.error.message}</p>}
    </form>
  );
}
