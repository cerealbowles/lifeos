"use client";

import { Search, Sparkles } from "lucide-react";
import { primaryNav, askNav, settingsNav } from "@/lib/nav";
import { openCommandPalette } from "@/components/command-palette/command-palette";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NavLink } from "./nav-link";
import { LogoutButton } from "./logout-button";
import type { User } from "@/lib/db/schema";

export function Sidebar({ user }: { user: User }) {
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
      {/* DECISIONS.md ADR-090 — monochrome outline, not the old solid bg-blue-600 tile. The
          logo was one of three independent full-saturation blues competing for attention
          (with the active-tab circle and the pulse dot); it now sits at the same visual
          weight as the "LifeOS" wordmark next to it instead of being the brightest thing
          on screen. */}
      <div className="mb-4 flex items-center gap-2 px-2 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-base font-semibold">LifeOS</span>
        <NotificationBell align="left" />
      </div>

      {/* Mouse-accessible entry point for the same palette Cmd/Ctrl+K opens — most people
          don't discover a keyboard shortcut until they've seen it written down once. */}
      <button
        type="button"
        onClick={openCommandPalette}
        className="mb-3 flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Quick add</span>
        <kbd className="rounded border border-neutral-200 px-1 text-[10px] text-neutral-400 dark:border-neutral-700">
          ⌘K
        </kbd>
      </button>

      <nav className="flex flex-1 flex-col gap-0.5">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="mt-4 flex flex-col gap-0.5 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <NavLink item={askNav} />
        <NavLink item={settingsNav} />
        <LogoutButton />
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg border-t border-neutral-200 px-2 pt-3 dark:border-neutral-800">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
        </div>
      </div>
    </aside>
  );
}
