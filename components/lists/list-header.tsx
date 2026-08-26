"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ListDTO } from "@/lib/lists/types";

/**
 * /lists/[id] previously only rendered the list name as a static heading — no way to rename
 * a list or remove it (there was no rename/delete capability anywhere, service layer
 * included). Matches the pattern in components/pets/pet-header.tsx.
 */
export function ListHeader({ list }: { list: ListDTO }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [name, setName] = useState(list.name);

  const rename = useMutation<{ list: ListDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ list: ListDTO }>(`/api/lists/${list.id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      setMode("view");
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      router.refresh();
    },
  });

  const remove = useMutation<unknown, ApiError>({
    mutationFn: () => apiFetch(`/api/lists/${list.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      router.push("/lists");
    },
  });

  if (mode === "edit") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          rename.mutate();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
        <Button type="submit" size="sm" disabled={rename.isPending || !name.trim()}>
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setMode("view")}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        {rename.isError && <p className="w-full text-xs text-red-600">{rename.error.message}</p>}
      </form>
    );
  }

  if (mode === "confirm-delete") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Remove &quot;{list.name}&quot;? This takes it off your Lists page.
        </p>
        <Button type="button" variant="outline" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
          Confirm
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setMode("view")}>
          Cancel
        </Button>
        {remove.isError && <p className="w-full text-xs text-red-600">{remove.error.message}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{list.name}</h1>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Rename ${list.name}`}
          onClick={() => setMode("edit")}
        >
          <Pencil className="h-4 w-4 text-neutral-400" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${list.name}`}
          onClick={() => setMode("confirm-delete")}
        >
          <Trash2 className="h-4 w-4 text-neutral-400" />
        </Button>
      </div>
    </div>
  );
}
