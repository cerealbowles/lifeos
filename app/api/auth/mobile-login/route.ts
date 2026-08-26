import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  // What to label this credential as in user_api_tokens — shown later if the user wants to
  // revoke one device without affecting others. Falls back to something generic rather than
  // rejecting the request over a missing label.
  deviceLabel: z.string().trim().min(1).max(100).optional(),
});

/**
 * JSON login for native clients (mobile/lifeos-android) — the web app's own login
 * (app/(auth)/login/actions.ts) is a Server Action (HTML form POST + redirect), not
 * something a REST client can call directly. Reuses the *exact* same verification that
 * Server Action does (verifyPassword against users.passwordHash) — no parallel auth logic,
 * just a JSON-in/JSON-out wrapper, then issues a user_api_tokens row instead of a browser
 * session cookie. The raw token is returned ONCE here and never retrievable again — only
 * its hash is stored (lib/db/schema/auth.ts), same as the WHOOP_WEBHOOK_TOKEN generation
 * story: copy it now.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email)).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = randomBytes(32).toString("base64url");
  const [row] = await db
    .insert(schema.userApiTokens)
    .values({
      userId: user.id,
      tokenHash: hashToken(token),
      deviceLabel: parsed.data.deviceLabel ?? "Unnamed device",
    })
    .returning();

  return NextResponse.json({ token, tokenId: row.id, deviceLabel: row.deviceLabel }, { status: 201 });
}
