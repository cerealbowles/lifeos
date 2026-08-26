"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventDTO } from "@/lib/calendar/types";

export function NewEventForm() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [location, setLocation] = useState("");

  const mutation = useMutation<{ event: EventDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ event: EventDTO }>("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({ title, startAt, location: location || undefined }),
      }),
    onSuccess: () => {
      setTitle("");
      setStartAt("");
      setLocation("");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !startAt) return;
        mutation.mutate();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="max-w-[200px]" />
      <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="w-56" />
      <Input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (optional)"
        className="max-w-[180px]"
      />
      <Button type="submit" size="sm" disabled={mutation.isPending || !title.trim() || !startAt}>
        <Plus className="h-4 w-4" />
        Add event
      </Button>
      {mutation.isError && <p className="w-full text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
