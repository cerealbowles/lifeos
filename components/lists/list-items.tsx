"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import { cn } from "@/lib/utils";
import type { ListItemDTO } from "@/lib/lists/types";

export function ListItems({ listId }: { listId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["list-items", listId];
  const [name, setName] = useState("");
  const { collapseThen, isCollapsing } = useCollapseThen();

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiFetch<{ items: ListItemDTO[] }>(`/api/lists/${listId}/items`),
  });

  const addItem = useMutation<{ item: ListItemDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ item: ListItemDTO }>(`/api/lists/${listId}/items`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleItem = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      apiFetch(`/api/lists/${listId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ checked }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => apiFetch(`/api/lists/${listId}/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addItem.mutate();
        }}
        className="flex items-center gap-2"
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item…" className="max-w-xs" />
        <Button type="submit" size="sm" disabled={addItem.isPending || !name.trim()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-neutral-400">Loading items…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-400">No items yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => (
            // Checking an item off is a persistent toggle, not a "resolved and gone" state —
            // it stays visible, crossed out (see cn() below), so it doesn't collapse. Only
            // removal actually takes it out of the list.
            <CollapsibleItem key={item.id} collapsed={isCollapsing(item.id)}>
              <div className="flex items-center gap-3 py-2">
                <Checkbox
                  checked={item.checked}
                  onChange={() => toggleItem.mutate({ itemId: item.id, checked: !item.checked })}
                />
                <span className={cn("flex-1 text-sm", item.checked && "text-neutral-400 line-through")}>
                  {item.name}
                  {item.quantity && <span className="ml-2 text-xs text-neutral-400">{item.quantity}</span>}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => collapseThen(item.id, () => removeItem.mutate(item.id))}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="h-4 w-4 text-neutral-400" />
                </Button>
              </div>
            </CollapsibleItem>
          ))}
        </ul>
      )}
    </div>
  );
}
