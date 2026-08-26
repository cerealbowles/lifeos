"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

/**
 * DECISIONS.md ADR-090. Today's tab used to be a solid filled circle (ADR-085) — direct
 * feedback flagged it as a notification-badge-like loud spot competing with the rest of the
 * nav bar, one of three independent full-saturation blues on screen at once (with the logo
 * and the pulse dot). Still reads as the nav's primary element, per the original "I want it
 * to be the main nav element" request — just through size and weight (a slightly larger,
 * bolder icon+label than MobileNavLink's other tabs) and the shared accent color only when
 * actually on Today, instead of a permanent colored shape regardless of where the user is.
 * No background shape at all — matches the calmer end of the requested options over an
 * underline or low-opacity tint.
 */
export function TodayNavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === "/";
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold",
        active ? "text-accent dark:text-accent-dark" : "text-neutral-400 dark:text-neutral-500",
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}
