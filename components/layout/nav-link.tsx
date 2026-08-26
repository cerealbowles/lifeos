"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

export function NavLink({ item, className }: { item: NavItem; className?: string }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent/10 text-accent dark:bg-accent-dark/15 dark:text-accent-dark"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span>{item.label}</span>
    </Link>
  );
}

export function MobileNavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
        active ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-500",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}
