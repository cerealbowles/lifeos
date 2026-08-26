"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { bottomNavPool, DEFAULT_BOTTOM_NAV_ITEMS } from "@/lib/nav";

const SLOT_LABELS = ["Far left", "Left of Today", "Right of Today", "Far right"];

/**
 * Configures the 4 customizable slots around the mobile bottom nav's fixed-center Today tab
 * (DECISIONS.md ADR-085). Deliberately 4 independent "which page goes in this exact position"
 * dropdowns rather than a reorderable list — it maps directly to MobileNav's fixed 5-column
 * grid (components/layout/mobile-nav.tsx), so there's no ambiguity about what "order" means
 * once Today is pinned in the middle, and no drag-and-drop UI to build for a 4-item list.
 */
export function BottomNavForm({ initialItems }: { initialItems: (string | null)[] | null }) {
  const router = useRouter();
  const [slots, setSlots] = useState<(string | null)[]>(initialItems ?? DEFAULT_BOTTOM_NAV_ITEMS);

  const mutation = useMutation<unknown, ApiError>({
    mutationFn: () =>
      apiFetch("/api/settings/nav", {
        method: "PATCH",
        body: JSON.stringify({ bottomNavItems: slots }),
      }),
    onSuccess: () => {
      // Not React-Query-cached data — MobileNav reads user.bottomNavItems straight from the
      // server layout on every request, so a cache invalidation wouldn't do anything here.
      router.refresh();
    },
  });

  function setSlot(index: number, value: string) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = value === "" ? null : value;
      return next;
    });
  }

  const chosenCount = slots.filter(Boolean).length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Today always sits in the middle of the mobile bottom nav. Choose up to 4 other pages for
        the positions around it — leave any as &quot;None&quot; to leave that spot empty.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SLOT_LABELS.map((label, i) => (
          <label key={label} className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            {label}
            <select
              value={slots[i] ?? ""}
              onChange={(e) => setSlot(i, e.target.value)}
              className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
            >
              <option value="">None</option>
              {bottomNavPool.map((item) => (
                <option
                  key={item.href}
                  value={item.href}
                  disabled={slots.includes(item.href) && slots[i] !== item.href}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending || chosenCount === 0}>
          Save nav layout
        </Button>
        {mutation.isSuccess && !mutation.isPending && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved.</span>
        )}
      </div>
      {chosenCount === 0 && <p className="text-xs text-amber-700 dark:text-amber-400">Choose at least one page.</p>}
      {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
