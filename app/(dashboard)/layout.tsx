import { requireUser } from "@/lib/auth/guards";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { QueryProvider } from "@/components/providers/query-provider";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { timeOfDay, TIME_OF_DAY_GRADIENT } from "@/lib/theme/time-of-day";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // DECISIONS.md ADR-105 — replaces the flat bg-neutral-50/950 the page would otherwise
  // inherit from <body> with a subtle per-time-of-day gradient. Card gained matching
  // transparency (components/ui/card.tsx) so this is actually visible through content.
  const gradient = TIME_OF_DAY_GRADIENT[timeOfDay(new Date(), user.timezone)];

  return (
    <QueryProvider>
      <div className="flex min-h-dvh flex-1">
        <Sidebar user={user} />
        {/* bg-fixed — without it, the gradient stretches across the full scrollable content
            height and washes out to its "to" color well before the fold on any page taller
            than one screen, making it invisible by the time you reach most cards. */}
        <main className={`flex-1 overflow-y-auto bg-fixed pb-20 md:pb-0 ${gradient}`}>
          <MobileHeader />
          <div className="mx-auto w-full max-w-5xl p-4 md:p-8">{children}</div>
        </main>
      </div>
      <MobileNav bottomNavItems={user.bottomNavItems} />
      {/* Mounted once at the shell level so Cmd/Ctrl+K works from every dashboard page. */}
      <CommandPalette />
    </QueryProvider>
  );
}
