"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { ListDTO } from "@/lib/lists/types";

export function ListGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: () => apiFetch<{ lists: ListDTO[] }>("/api/lists"),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading lists…</p>;

  const lists = data?.lists ?? [];
  if (lists.length === 0) {
    return <p className="text-sm text-neutral-400">No lists yet. Create one above.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {lists.map((list) => (
        <Link key={list.id} href={`/lists/${list.id}`}>
          <Card className="transition-colors hover:border-neutral-400 dark:hover:border-neutral-600">
            <CardContent className="p-4">
              <CardTitle className="text-sm normal-case tracking-normal text-neutral-900 dark:text-neutral-100">
                {list.name}
              </CardTitle>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
