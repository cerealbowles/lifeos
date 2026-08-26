"use client";

import { todayNav, findNavItem, DEFAULT_BOTTOM_NAV_ITEMS } from "@/lib/nav";
import { MobileNavLink } from "./nav-link";
import { TodayNavLink } from "./today-nav-link";

/**
 * Fixed 5-column grid — not a dynamic-width flex row — specifically so Today's screen
 * position never moves regardless of how many of the 4 customizable slots are filled
 * (DECISIONS.md ADR-085: "Today tab is always in the middle" is guaranteed geometrically,
 * not just by ordering). Slots map left-to-right: [leftOuter, leftInner, TODAY, rightInner,
 * rightOuter]. An unset slot (null) or a stale/removed href just renders an empty grid cell,
 * not a layout shift.
 *
 * "use client" is required here, not just stylistic — `NavItem.icon` is a component
 * reference (a lucide-react function), and passing that as a prop from a Server Component to
 * a Client Component (MobileNavLink/TodayNavLink) isn't serializable across that boundary
 * ("Only plain objects can be passed to Client Components from Server Components"). Keeping
 * this whole subtree client-side, like the original mobileNav implementation did, sidesteps
 * the boundary entirely.
 */
export function MobileNav({ bottomNavItems }: { bottomNavItems: (string | null)[] | null }) {
  const slots = bottomNavItems ?? DEFAULT_BOTTOM_NAV_ITEMS;
  const [leftOuter, leftInner, rightInner, rightOuter] = [slots[0], slots[1], slots[2], slots[3]];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden dark:border-neutral-800 dark:bg-neutral-900/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Slot href={leftOuter} />
      <Slot href={leftInner} />
      <TodayNavLink item={todayNav} />
      <Slot href={rightInner} />
      <Slot href={rightOuter} />
    </nav>
  );
}

function Slot({ href }: { href: string | null }) {
  const item = findNavItem(href);
  if (!item) return <div aria-hidden="true" />;
  return <MobileNavLink item={item} />;
}
