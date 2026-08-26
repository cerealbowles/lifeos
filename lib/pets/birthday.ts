// Deliberately NOT "server-only" — this is pure date arithmetic (no DB, no secrets), so both
// lib/today/service.ts (server) and components/pets/pet-header.tsx (client, to show "turns
// N on {date}" on the pet's own page) import it directly.

/**
 * Given a pet's birth date ("YYYY-MM-DD") and the current moment, returns this year's
 * birthday if it hasn't happened yet, or next year's if it has — always the *next* upcoming
 * occurrence, annually recurring. `age` is the age they're turning on that date, not their
 * current age.
 *
 * Feeds Today's ranking pipeline (lib/today/service.ts) the same way any other due date
 * does — see DECISIONS.md for why this is computed fresh from `pets.birth_date` rather than
 * stored as a recurring pet_event row (single source of truth, no sync/staleness to manage).
 *
 * Known minor edge case, not specially handled: a Feb 29 birth date on a non-leap year rolls
 * forward to Mar 1 (plain JS Date arithmetic) rather than falling back to Feb 28 — acceptable
 * for a once-every-four-years quirk on a nice-to-have feature.
 */
export function nextBirthday(birthDate: string, now: Date): { date: Date; age: number } {
  const [birthYear, month, day] = birthDate.split("-").map(Number);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let date = new Date(now.getFullYear(), month - 1, day);
  if (date < todayMidnight) {
    date = new Date(now.getFullYear() + 1, month - 1, day);
  }

  return { date, age: date.getFullYear() - birthYear };
}
