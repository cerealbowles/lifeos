import "server-only";

import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";

const SESSION_COOKIE = "lifeos_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Exported — lib/auth/api-token.ts reuses this exact hashing for user_api_tokens rather
// than inventing a second hashing convention for what's structurally the same idea
// (an opaque client-held token, only its hash stored server-side).
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// NODE_ENV=production does not mean HTTPS — a self-hosted deployment reached over plain
// HTTP (no reverse proxy/TLS yet) needs a non-Secure cookie, or the browser silently drops
// it and every navigation looks unauthenticated. Derive from the actual public URL instead.
function shouldUseSecureCookie(): boolean {
  return process.env.APP_URL?.startsWith("https://") ?? false;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row?.user ?? null;
}
