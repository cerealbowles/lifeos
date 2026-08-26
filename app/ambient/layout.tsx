import { requireUser } from "@/lib/auth/guards";

/**
 * DECISIONS.md ADR-057/058 (Ambient Display) — a third presentation surface, deliberately
 * outside the (dashboard) route group so it does NOT inherit the Sidebar/mobile nav layout.
 * "Minimal interaction" per the source doc means no persistent chrome at all here, not just
 * a smaller version of it. Still requires being logged in — same session, same auth guard as
 * every other page (no separate kiosk/unauthenticated mode; a shared household device is
 * expected to just stay logged into a normal account, same as any browser tab would).
 */
export default async function AmbientLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return <div className="min-h-dvh bg-neutral-950 text-neutral-100">{children}</div>;
}
