import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Home,
  ListChecks,
  PawPrint,
  HeartPulse,
  Wallet,
  Trophy,
  Rss,
  StickyNote,
  Sparkles,
  Settings,
  Sun,
  Activity,
  Flame,
  Cannabis,
  CloudSun,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const primaryNav: NavItem[] = [
  { label: "Today", href: "/", icon: Sun },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Tasks", href: "/home", icon: Home },
  { label: "Lists", href: "/lists", icon: ListChecks },
  { label: "Pets", href: "/pets", icon: PawPrint },
  { label: "Weather", href: "/weather", icon: CloudSun },
  { label: "Health", href: "/health", icon: HeartPulse },
  { label: "Money", href: "/money", icon: Wallet },
  { label: "Sports", href: "/sports", icon: Trophy },
  { label: "Feed", href: "/feed", icon: Rss },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Challenges", href: "/challenges", icon: Flame },
  { label: "Grow", href: "/grow", icon: Cannabis },
];

export const askNav: NavItem = { label: "Ask LifeOS", href: "/ask", icon: Sparkles };
export const settingsNav: NavItem = { label: "Settings", href: "/settings", icon: Settings };
export const todayNav: NavItem = primaryNav[0]; // Today — always the mobile bottom nav's fixed center tab.

/**
 * Not a page to browse — tapping it starts (or resumes) a timed activity session and
 * redirects straight into the Ambient stopwatch (app/activity/start/page.tsx, DECISIONS.md
 * ADR-087). Still just a plain `<Link href>` like every other nav item; the "start a
 * session" side effect lives entirely in that server page, so MobileNavLink needs no special
 * casing for it.
 */
export const activityNav: NavItem = { label: "Activity", href: "/activity/start", icon: Activity };

/**
 * Everything selectable for the mobile bottom nav's 4 customizable slots (DECISIONS.md
 * ADR-085) — every primaryNav destination except Today itself (it's pinned center, not a
 * pickable slot) plus Ask LifeOS and Activity. Settings is deliberately excluded: it moved to
 * the mobile header (components/layout/mobile-header.tsx) specifically so the bottom nav's
 * limited slots go to content pages, not app chrome.
 */
export const bottomNavPool: NavItem[] = [...primaryNav.slice(1), askNav, activityNav];

/**
 * [leftOuter, leftInner, rightInner, rightOuter] — the 4 slots flanking Today's fixed center
 * position. Applied when a user's `bottomNavItems` column is null (never configured) — see
 * lib/db/schema/users.ts and components/layout/mobile-nav.tsx.
 */
export const DEFAULT_BOTTOM_NAV_ITEMS: (string | null)[] = ["/calendar", "/lists", "/ask", null];

export function findNavItem(href: string | null): NavItem | null {
  if (!href) return null;
  return bottomNavPool.find((item) => item.href === href) ?? null;
}
