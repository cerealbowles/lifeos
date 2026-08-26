import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        // DECISIONS.md ADR-105 — semi-transparent so the dashboard shell's time-of-day
        // gradient (app/(dashboard)/layout.tsx) shows through. /98 was the first pass but
        // proved imperceptible in practice (dark-mode card + dark-mode gradient are both
        // already near-black) — dropped to /85 (light) / /80 (dark) so it's actually visible.
        // DECISIONS.md ADR-119 (landscape direction, "material, not card-heavy") — larger
        // radius and a softer two-layer shadow instead of flat shadow-sm, aiming for "stone
        // surface" rather than a generic Material card. Still one border, still restrained.
        "rounded-2xl border border-neutral-200 bg-white/85 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_24px_-16px_rgba(0,0,0,0.3)] backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-[0_1px_0_rgba(255,255,255,0.03),0_12px_28px_-16px_rgba(0,0,0,0.6)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-2", className)} {...props} />;
}

/**
 * `href`, when given, makes the whole title a link to that section's own page — e.g. Today's
 * "SPORTS" group header links to /sports. Kept as one shared option on CardTitle itself
 * (rather than each card hand-rolling its own `<Link>` wrapper) since it's the same visual/
 * behavioral pattern everywhere it's used.
 */
export function CardTitle({
  className,
  href,
  children,
  ...props
}: React.ComponentProps<"h3"> & { href?: string }) {
  const titleClass = cn(
    "text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400",
    className,
  );

  if (href) {
    return (
      <h3 className={titleClass}>
        <Link href={href} className="hover:text-neutral-700 hover:underline dark:hover:text-neutral-200">
          {children}
        </Link>
      </h3>
    );
  }

  return (
    <h3 className={titleClass} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}
