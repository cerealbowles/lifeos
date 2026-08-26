import { CheckSquare, RefreshCw, PawPrint, Wallet, CalendarDays, Trophy, Cannabis, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateDomain } from "@/lib/today/ranking";

const DOMAIN_META: Record<
  CandidateDomain,
  { icon: LucideIcon; label: string; href: string; circleClass: string }
> = {
  task: {
    icon: CheckSquare,
    label: "Task",
    href: "/home",
    circleClass: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  routine: {
    icon: RefreshCw,
    label: "Routine",
    href: "/home",
    circleClass: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  },
  pet: {
    icon: PawPrint,
    label: "Pet",
    href: "/pets",
    circleClass: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
  financial: {
    icon: Wallet,
    label: "Bill",
    href: "/money",
    circleClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  },
  calendar: {
    icon: CalendarDays,
    label: "Event",
    href: "/calendar",
    circleClass: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  },
  sports: {
    icon: Trophy,
    label: "Game",
    href: "/sports",
    circleClass: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  },
  grow: {
    icon: Cannabis,
    label: "Grow check",
    href: "/grow",
    circleClass: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  },
};

export function domainMeta(domain: CandidateDomain) {
  return DOMAIN_META[domain];
}

export function DomainIcon({ domain, className }: { domain: CandidateDomain; className?: string }) {
  const Icon = DOMAIN_META[domain].icon;
  return <Icon className={className} strokeWidth={1.75} />;
}

// One neutral treatment for every domain, used for "muted" tone — see DECISIONS.md's
// Color Principles ("avoid turning every domain into a brightly colored permanent card...
// the calm state should use restrained color"). Deliberately domain-agnostic: the point is
// that ambient/TODAY-tier content shouldn't compete for color the way NOW does.
const MUTED_CIRCLE_CLASS = "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";

/**
 * Icon-in-a-colored-circle avatar, one per domain. `tone="vivid"` (default) is the full
 * per-domain color — reserved for NOW, where something has actually earned prominence.
 * `tone="muted"` is one shared neutral treatment across all domains — used for TODAY and
 * anywhere else that's ambient/browsable rather than currently urgent, so visual weight
 * still tracks relevance (DECISIONS.md ADR-029/041) instead of every section being equally
 * loud all the time.
 */
export function DomainAvatar({
  domain,
  className,
  tone = "vivid",
}: {
  domain: CandidateDomain;
  className?: string;
  tone?: "vivid" | "muted";
}) {
  const { icon: Icon, circleClass } = DOMAIN_META[domain];
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        tone === "muted" ? MUTED_CIRCLE_CLASS : circleClass,
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}
