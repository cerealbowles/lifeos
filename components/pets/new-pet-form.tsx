"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PetDTO } from "@/lib/pets/types";

export function NewPetForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");

  const mutation = useMutation<{ pet: PetDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ pet: PetDTO }>("/api/pets", { method: "POST", body: JSON.stringify({ name, species }) }),
    onSuccess: () => {
      setName("");
      setSpecies("");
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !species.trim()) return;
        mutation.mutate();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="max-w-[160px]" />
      <Input
        value={species}
        onChange={(e) => setSpecies(e.target.value)}
        placeholder="Species (e.g. dog)"
        className="max-w-[160px]"
      />
      <Button type="submit" size="sm" disabled={mutation.isPending || !name.trim() || !species.trim()}>
        <Plus className="h-4 w-4" />
        Add pet
      </Button>
      {mutation.isError && <p className="w-full text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
