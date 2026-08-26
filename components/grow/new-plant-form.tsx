"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROW_STAGES } from "@/lib/db/schema";
import type { GrowPlantDTO } from "@/lib/growing/types";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function NewPlantForm() {
  const queryClient = useQueryClient();
  const [strain, setStrain] = useState("");
  const [datePlanted, setDatePlanted] = useState(todayDateString());
  const [stage, setStage] = useState<string>("seedling");

  const mutation = useMutation<{ plant: GrowPlantDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ plant: GrowPlantDTO }>("/api/grow", {
        method: "POST",
        body: JSON.stringify({ strain, datePlanted, stage }),
      }),
    onSuccess: () => {
      setStrain("");
      setDatePlanted(todayDateString());
      setStage("seedling");
      queryClient.invalidateQueries({ queryKey: ["grow-plants"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!strain.trim()) return;
        mutation.mutate();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <Input
        value={strain}
        onChange={(e) => setStrain(e.target.value)}
        placeholder="Strain (e.g. Apple Fritter)"
        className="max-w-[200px]"
      />
      <Input type="date" value={datePlanted} onChange={(e) => setDatePlanted(e.target.value)} className="w-40" />
      <select
        value={stage}
        onChange={(e) => setStage(e.target.value)}
        aria-label="Stage"
        className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
      >
        {GROW_STAGES.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={mutation.isPending || !strain.trim()}>
        <Plus className="h-4 w-4" />
        Add plant
      </Button>
      {mutation.isError && <p className="w-full text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
