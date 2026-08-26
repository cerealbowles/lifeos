"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TASK_CATEGORIES } from "@/lib/db/schema";
import type { TaskDTO } from "@/lib/tasks/types";

export function NewTaskForm() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [category, setCategory] = useState("");

  const mutation = useMutation<{ task: TaskDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ task: TaskDTO }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title, dueAt: dueAt || undefined, category: category || undefined }),
      }),
    onSuccess: () => {
      setTitle("");
      setDueAt("");
      setCategory("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        mutation.mutate();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="max-w-xs"
      />
      <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-40" />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Category"
        className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
      >
        <option value="">No category</option>
        {TASK_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={mutation.isPending || !title.trim()}>
        <Plus className="h-4 w-4" />
        Add
      </Button>
      {mutation.isError && <p className="w-full text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
