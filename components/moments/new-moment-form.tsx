"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * DECISIONS.md ADR-096. This is the manual in-app fallback (photo picker + one-line caption)
 * — a real iOS Share Sheet extension is out of scope for this Next.js codebase, so a future
 * iOS Shortcut is the intended primary capture path, hitting POST /api/moments directly with
 * MOMENTS_WEBHOOK_TOKEN (see .env.example). This form covers "capture from inside the app"
 * and doubles as how to test the flow without a Shortcut configured.
 *
 * Not using lib/api-client's apiFetch here — it hardcodes `Content-Type: application/json`,
 * which would break the multipart boundary the browser needs to set itself for a File body.
 *
 * DECISIONS.md ADR-097: the file input is visually hidden and triggered by a "Take Photo"
 * button rather than shown as a bare browser-styled file input — `capture="environment"`
 * already opens the device camera directly on mobile, but a default-styled file input read as
 * a generic file chooser, not an obvious "tap to take a photo," which caused real confusion
 * (same fix applied to Grow's per-plant photo upload, components/grow/plant-photo-upload.tsx).
 */
export function NewMomentForm() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  const mutation = useMutation<void, ApiError>({
    mutationFn: async () => {
      if (!file) throw new ApiError("Choose a photo first.", 400);
      const form = new FormData();
      form.set("file", file);
      if (caption.trim()) form.set("caption", caption.trim());

      const res = await fetch("/api/moments", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(body?.error ?? `Request failed with ${res.status}`, res.status);
      }
    },
    onSuccess: () => {
      setFile(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["moments"] });
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
            placeholder="One-line caption (optional)"
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
