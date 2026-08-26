"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * DECISIONS.md ADR-092. `getLatestMeasurement` (the Weight card's header stat) is a
 * server-fetched prop, not a useQuery cache, so a successful add both invalidates the
 * ["measurements", ...] queries (the chart, the log — both real useQuery caches) and calls
 * router.refresh() (re-runs the server component for the latest-reading header) — same
 * split BottomNavForm/ActivityLogRow already use for the same reason.
 */
export function NewWeightForm({ unit }: { unit: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayDateString());
  const [value, setValue] = useState("");

  const mutation = useMutation<unknown, ApiError>({
    mutationFn: () =>
      apiFetch("/api/measurements", {
        method: "POST",
        body: JSON.stringify({ type: "weight", value, unit, measuredAt: date }),
      }),
    onSuccess: () => {
      setValue("");
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim() || !date) return;
        mutation.mutate();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
      <Input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Weight (${unit})`}
        className="w-32"
      />
      <Button type="submit" size="sm" disabled={mutation.isPending || !value.trim()}>
        <Plus className="h-4 w-4" />
        Log weight
      </Button>
      {mutation.isError && <p className="w-full text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
