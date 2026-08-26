/**
 * DECISIONS.md ADR-099 (found while building the sports overhaul, not sports-specific).
 * drizzle-orm wraps the underlying `postgres` driver's error in a `DrizzleQueryError`, with
 * the real `PostgresError` (the one that actually carries `.code`) nested under `.cause` —
 * not on the caught error directly. `app/api/feed/subscriptions/route.ts`'s unique-violation
 * check (`"code" in err && err.code === "23505"`) had the same bug already, just never
 * actually exercised — a real 500 was returned instead of the intended 409, so this needed a
 * shared, correct helper rather than a second copy of the same near-miss.
 */
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && err.code === "23505") return true;
  if ("cause" in err && err.cause && typeof err.cause === "object" && "code" in err.cause && err.cause.code === "23505") {
    return true;
  }
  return false;
}
