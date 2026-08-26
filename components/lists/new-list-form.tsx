"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ListDTO } from "@/lib/lists/types";

export function NewListForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const mutation = useMutation<{ list: ListDTO }, ApiError>({
    mutationFn: () => apiFetch<{ list: ListDTO }>("/api/lists", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        mutation.mutate();
      }}
      className="flex items-center gap-2"
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New list name…" className="max-w-xs" />
      <Button type="submit" size="sm" disabled={mutation.isPending || !name.trim()}>
        <Plus className="h-4 w-4" />
        Create list
      </Button>
      {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
