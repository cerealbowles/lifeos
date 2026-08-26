"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DomainAvatar } from "@/components/dashboard/domain-icon";
import { dayCount } from "@/lib/growing/day";
import type { GrowPlantDTO } from "@/lib/growing/types";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Shows harvested plants alongside active ones, not hidden — mirrors the Pets grid exactly
 * (DECISIONS.md ADR-082/094): the API already returns both, active-first
 * (lib/growing/service.ts's listAllPlants), and a harvested card is dimmed with a "Harvested"
 * badge rather than removed, since the grow history is the point of tracking it at all.
 */
export function PlantGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ["grow-plants"],
    queryFn: () => apiFetch<{ plants: GrowPlantDTO[] }>("/api/grow"),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading plants…</p>;

  const plants = data?.plants ?? [];
  if (plants.length === 0) {
    return <p className="text-sm text-neutral-400">No plants yet. Add one above.</p>;
  }

  const today = todayDateString();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {plants.map((plant) => (
        <Link key={plant.id} href={`/grow/${plant.id}`}>
          <Card
            className={
              plant.active
                ? "transition-colors hover:border-neutral-400 dark:hover:border-neutral-600"
                : "opacity-60 transition-colors hover:border-neutral-400 hover:opacity-100 dark:hover:border-neutral-600"
            }
          >
            <CardContent className="flex items-center gap-3 p-4">
              <DomainAvatar domain="grow" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {plant.strain}
                  {!plant.active && <Badge variant="outline">Harvested</Badge>}
                </p>
                <p className="truncate text-xs text-neutral-500 capitalize dark:text-neutral-400">
                  {plant.stage} · day {dayCount(plant.datePlanted, today)}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
