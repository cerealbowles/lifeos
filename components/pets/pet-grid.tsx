"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DomainAvatar } from "@/components/dashboard/domain-icon";
import type { PetDTO } from "@/lib/pets/types";

/**
 * Shows retired pets alongside active ones, not hidden — the API already returns both
 * (active-first) via listAllPets. Retired cards are visually dimmed with a "Retired" badge
 * rather than removed, since the whole point of retiring instead of deleting is that they're
 * still part of the household's history.
 */
export function PetGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => apiFetch<{ pets: PetDTO[] }>("/api/pets"),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading pets…</p>;

  const pets = data?.pets ?? [];
  if (pets.length === 0) {
    return <p className="text-sm text-neutral-400">No pets yet. Add one above.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {pets.map((pet) => (
        <Link key={pet.id} href={`/pets/${pet.id}`}>
          <Card
            className={
              pet.active
                ? "transition-colors hover:border-neutral-400 dark:hover:border-neutral-600"
                : "opacity-60 transition-colors hover:border-neutral-400 hover:opacity-100 dark:hover:border-neutral-600"
            }
          >
            <CardContent className="flex items-center gap-3 p-4">
              <DomainAvatar domain="pet" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {pet.name}
                  {!pet.active && <Badge variant="outline">Retired</Badge>}
                </p>
                <p className="truncate text-xs capitalize text-neutral-500 dark:text-neutral-400">
                  {pet.breed ? `${pet.breed} · ${pet.species}` : pet.species}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
