import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUserOrApiToken } from "@/lib/auth/api-token";

/**
 * Revoke one device's API token — session OR bearer-token auth now (was session-only): the
 * native Settings screen needs to be able to revoke *itself* ("sign out this device") using
 * its own bearer token, not just the web app revoking some other device via a cookie session.
 * Scoped to the caller's own userId either way, so a bearer token still can't touch another
 * user's tokens.
 */
export async function DELETE(request: Request, ctx: RouteContext<"/api/auth/tokens/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  await db
    .delete(schema.userApiTokens)
    .where(and(eq(schema.userApiTokens.id, id), eq(schema.userApiTokens.userId, user.id)));

  return NextResponse.json({ ok: true });
}
