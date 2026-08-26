import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUserOrApiToken } from "@/lib/auth/api-token";

/**
 * Lists the current user's devices (user_api_tokens rows), for the native Settings screen's
 * device-management list. Never returns tokenHash — a device is identified by id/label only,
 * the raw token itself was shown once at issuance (POST /api/auth/mobile-login) and is gone.
 *
 * Marks `isCurrent` by comparing against `auth.tokenId` (the row the *presented* bearer token
 * hashed to) rather than trusting a client-cached id — a session issued before that client-side
 * caching existed would otherwise never match its own row and could show "Revoke" on itself
 * with no indication that's what it is.
 */
export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: schema.userApiTokens.id,
      deviceLabel: schema.userApiTokens.deviceLabel,
      createdAt: schema.userApiTokens.createdAt,
      lastUsedAt: schema.userApiTokens.lastUsedAt,
    })
    .from(schema.userApiTokens)
    .where(eq(schema.userApiTokens.userId, auth.user.id))
    .orderBy(desc(schema.userApiTokens.createdAt));

  const tokens = rows.map((row) => ({ ...row, isCurrent: row.id === auth.tokenId }));
  return NextResponse.json({ tokens });
}
