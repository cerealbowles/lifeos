import "server-only";

import { db, schema } from "@/lib/db";
import { getCurrentUser } from "./session";
import type { User } from "@/lib/db/schema";

export type WebhookAuthResult = { user: User; via: "session" | "webhook" };

/**
 * DECISIONS.md ADR-095. POST /api/workouts is meant to be hit two ways: the in-app quick-log
 * UI (a normal browser session, cookie-authenticated like every other route) and an external
 * automation — Home Assistant, an iOS Shortcut, an NFC tag — none of which can hold a browser
 * session cookie. Those authenticate with a static bearer token instead
 * (`WORKOUT_WEBHOOK_TOKEN` in .env), checked only if no session cookie is present, so this
 * never weakens the normal cookie-auth path. Returns which method actually succeeded (not
 * just "was a header present") so the caller can accurately record `workouts.source`.
 *
 * Looks up "the" user rather than a specific one — reasonable given every other part of this
 * app already assumes single-user-in-practice (DECISIONS.md ADR-012 and others: every table
 * carries `user_id` for eventual multi-user, but nothing enforces it yet). Revisit this
 * specific lookup if multi-user ever actually ships — a webhook token would need to identify
 * which user's workout it is, not just "the only one."
 *
 * `envVar` picks which .env token gates this specific route (DECISIONS.md ADR-096 reuses this
 * for POST /api/moments with its own `MOMENTS_WEBHOOK_TOKEN` rather than sharing
 * `WORKOUT_WEBHOOK_TOKEN` — a leaked/rotated token for one automation shouldn't affect the
 * other, and each is independently opt-in). POST /api/whoop/readings reuses it again with
 * `WHOOP_WEBHOOK_TOKEN`, for the mobile/whoop-bridge companion app.
 */
export async function requireUserOrWebhookToken(
  request: Request,
  envVar: "WORKOUT_WEBHOOK_TOKEN" | "MOMENTS_WEBHOOK_TOKEN" | "WHOOP_WEBHOOK_TOKEN" = "WORKOUT_WEBHOOK_TOKEN",
): Promise<WebhookAuthResult | null> {
  const sessionUser = await getCurrentUser();
  if (sessionUser) return { user: sessionUser, via: "session" };

  const expectedToken = process.env[envVar];
  if (!expectedToken) return null; // Webhook auth is opt-in — unset means it's simply disabled.

  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!providedToken || providedToken !== expectedToken) return null;

  const [user] = await db.select().from(schema.users).limit(1);
  return user ? { user, via: "webhook" } : null;
}
