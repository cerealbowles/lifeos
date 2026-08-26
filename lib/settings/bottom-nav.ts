import { bottomNavPool } from "@/lib/nav";

const VALID_HREFS = new Set(bottomNavPool.map((item) => item.href));

/**
 * Validates the 4 mobile-bottom-nav slots server-side, independent of the Settings form's own
 * client-side guards (dropdowns already constrain choices, but this is the actual trust
 * boundary — see DECISIONS.md ADR-085). Each slot must be null or a real, currently-offered
 * page; duplicates aren't allowed (picking the same page twice would silently swallow one of
 * them); at least one non-null slot, since a bottom nav with only Today isn't a nav.
 *
 * Pure — no DB, no "server-only" — so it's unit-testable and importable from
 * lib/settings/service.ts (which does touch the DB) without pulling DATABASE_URL into scope,
 * same reasoning as lib/pets/birthday.ts and lib/weather/ambient.ts.
 */
export function validateBottomNavItems(items: unknown): items is (string | null)[] {
  if (!Array.isArray(items) || items.length !== 4) return false;
  const nonNull = items.filter((item): item is string => item !== null);
  if (!nonNull.every((href) => typeof href === "string" && VALID_HREFS.has(href))) return false;
  if (new Set(nonNull).size !== nonNull.length) return false;
  return nonNull.length >= 1;
}
