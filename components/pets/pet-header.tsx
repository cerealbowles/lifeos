"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, HeartHandshake, RotateCcw, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { nextBirthday } from "@/lib/pets/birthday";
import type { PetDTO } from "@/lib/pets/types";

/**
 * /pets/[id] previously only rendered the pet's name/species as static text — no way to fix
 * a typo, add a breed/birth date after the fact, or retire a pet at all (the DELETE endpoint
 * existed server-side but nothing in the UI could ever call it). This replaces that static
 * header with an editable one that also surfaces the pet's next birthday and, for a retired
 * pet, a way to restore them.
 */
export function PetHeader({ pet }: { pet: PetDTO }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit" | "confirm-retire">("view");
  const [name, setName] = useState(pet.name);
  const [species, setSpecies] = useState(pet.species);
  const [breed, setBreed] = useState(pet.breed ?? "");
  const [birthDate, setBirthDate] = useState(pet.birthDate ?? "");

  const update = useMutation<{ pet: PetDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ pet: PetDTO }>(`/api/pets/${pet.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          species,
          breed: breed.trim() ? breed : null,
          birthDate: birthDate.trim() ? birthDate : null,
        }),
      }),
    onSuccess: () => {
      setMode("view");
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      router.refresh();
    },
  });

  const retire = useMutation<unknown, ApiError>({
    mutationFn: () => apiFetch(`/api/pets/${pet.id}`, { method: "DELETE" }),
    onSuccess: () => {
      // Unlike the old hard-delete flow (which navigated away with router.push, so local
      // mode didn't matter), retiring keeps the user on this page — without resetting mode
      // back to "view" here, the confirm screen stays stuck showing "Confirm"/"Cancel" even
      // though the pet is already retired server-side.
      setMode("view");
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      router.refresh();
    },
  });

  const restore = useMutation<{ pet: PetDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ pet: PetDTO }>(`/api/pets/${pet.id}`, { method: "PATCH", body: JSON.stringify({ active: true }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      router.refresh();
    },
  });

  if (mode === "edit") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !species.trim()) return;
          update.mutate();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="max-w-[160px]" />
          <Input
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="Species"
            className="max-w-[140px]"
          />
          <Input
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="Breed (optional)"
            className="max-w-[160px]"
          />
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            aria-label="Birth date"
            className="max-w-[160px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={update.isPending || !name.trim() || !species.trim()}>
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("view")}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
        {update.isError && <p className="text-xs text-red-600">{update.error.message}</p>}
      </form>
    );
  }

  if (mode === "confirm-retire") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Retire {pet.name}? They&apos;ll stay visible here, marked inactive, and their full history is kept — you
          can restore them anytime.
        </p>
        <Button type="button" variant="outline" size="sm" disabled={retire.isPending} onClick={() => retire.mutate()}>
          Confirm
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setMode("view")}>
          Cancel
        </Button>
        {retire.isError && <p className="w-full text-xs text-red-600">{retire.error.message}</p>}
      </div>
    );
  }

  const birthday = pet.birthDate ? nextBirthday(pet.birthDate, new Date()) : null;

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{pet.name}</h1>
          {!pet.active && <Badge variant="outline">Retired</Badge>}
        </div>
        <p className="text-sm capitalize text-neutral-500 dark:text-neutral-400">
          {pet.breed ? `${pet.breed} · ${pet.species}` : pet.species}
        </p>
        {birthday && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Turns {birthday.age} on {birthday.date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${pet.name}`} onClick={() => setMode("edit")}>
          <Pencil className="h-4 w-4 text-neutral-400" />
        </Button>
        {pet.active ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Retire ${pet.name}`}
            onClick={() => setMode("confirm-retire")}
          >
            <HeartHandshake className="h-4 w-4 text-neutral-400" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Restore ${pet.name}`}
            disabled={restore.isPending}
            onClick={() => restore.mutate()}
          >
            <RotateCcw className="h-4 w-4 text-neutral-400" />
          </Button>
        )}
      </div>
    </div>
  );
}
