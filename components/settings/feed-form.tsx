"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FeedSubscriptionDTO } from "@/lib/feed/types";

export function FeedForm() {
  const queryClient = useQueryClient();
  const [feedUrl, setFeedUrl] = useState("");

  const { data } = useQuery({
    queryKey: ["feed-subscriptions"],
    queryFn: () => apiFetch<{ subscriptions: FeedSubscriptionDTO[] }>("/api/feed/subscriptions"),
  });
  const subscriptions = data?.subscriptions ?? [];

  const addSubscription = useMutation<unknown, ApiError, string>({
    mutationFn: (url) => apiFetch("/api/feed/subscriptions", { method: "POST", body: JSON.stringify({ feedUrl: url }) }),
    onSuccess: () => {
      setFeedUrl("");
      queryClient.invalidateQueries({ queryKey: ["feed-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["feed-items"] });
    },
  });

  const removeSubscription = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/feed/subscriptions/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-subscriptions"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      {subscriptions.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {subscriptions.map((sub) => (
            <li key={sub.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{sub.title}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSubscription.mutate(sub.id)}
                aria-label={`Unsubscribe from ${sub.title}`}
              >
                <Trash2 className="h-4 w-4 text-neutral-400" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!feedUrl.trim()) return;
          addSubscription.mutate(feedUrl.trim());
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <Input
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          placeholder="https://example.com/feed.xml"
          type="url"
          className="max-w-[320px] flex-1"
        />
        <Button type="submit" size="sm" disabled={!feedUrl.trim() || addSubscription.isPending}>
          <Plus className="h-4 w-4" />
          {addSubscription.isPending ? "Subscribing…" : "Subscribe"}
        </Button>
      </form>

      {addSubscription.isError && <p className="text-xs text-red-600">{addSubscription.error.message}</p>}
    </div>
  );
}
