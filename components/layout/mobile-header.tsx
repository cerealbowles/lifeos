"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Settings, Sparkles } from "lucide-react";
import { primaryNav } from "@/lib/nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

/**
 * Mobile-only top bar (DECISIONS.md ADR-085/097) — home for the Settings link now that it's
 * out of the bottom nav, which is reserved for Today (fixed center) plus up to 4 user-chosen
 * content pages.
 *
 * DECISIONS.md ADR-097: on a detail route nested one level under a known nav destination
 * (`/grow/[id]`, `/pets/[id]`, `/challenges/[id]`, `/lists/[id]`, etc.), the left side swaps
 * from the LifeOS brand to a back button pointing at that parent list, with its nav label as
 * the visible text — a real tap target back to "the list," not just relying on swipe-back
 * gesture history (which doesn't always land where a user expects, e.g. after following a
 * link in from Today rather than browsing the list first). Derived purely from the URL's
 * first path segment matched against `primaryNav` — no per-page wiring needed, and it
 * naturally excludes routes that aren't "list → detail" (e.g. `/activity/start`, `/ambient/*`
 * aren't in `primaryNav`, so they keep the default brand header).
 */
export function MobileHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const parentHref = segments.length > 1 ? `/${segments[0]}` : null;
  const parentNavItem = parentHref ? (primaryNav.find((item) => item.href === parentHref) ?? null) : null;

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden dark:border-neutral-800 dark:bg-neutral-900/95"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
    >
      {parentNavItem ? (
        <Link
          href={parentNavItem.href}
          className="-ml-1.5 flex items-center gap-1.5 rounded-full py-1.5 pr-2.5 pl-1.5 text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-sm font-semibold">{parentNavItem.label}</span>
        </Link>
      ) : (
        // DECISIONS.md ADR-090 — monochrome outline, matching the desktop Sidebar's logo
        // treatment (no more solid bg-blue-600 tile).
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-semibold">LifeOS</span>
        </Link>
      )}
      <div className="flex items-center gap-1">
        <NotificationBell />
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
}
