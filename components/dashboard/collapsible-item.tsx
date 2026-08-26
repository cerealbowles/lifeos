"use client";

import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLLAPSE_DURATION_MS } from "@/lib/hooks/use-collapse-then";

/**
 * DECISIONS.md Motion Principles ("completed attention collapses and recedes") — a list item
 * shrinks and fades before useCollapseThen actually fires the mutation, instead of an instant
 * hard cut when the query refetches. Renders as the list item element itself (`<li>` by
 * default) so a divide-y border collapses along with the content, not just an inner wrapper.
 *
 * The max-h-24 ceiling on the expanded state is a deliberate CSS workaround, not a real
 * layout constraint: transitioning max-height requires an explicit start value (you can't
 * animate to/from `none`), so this picks a value generously larger than any real row here.
 */
export function CollapsibleItem({
  collapsed,
  children,
  className,
  as: Tag = "li",
}: {
  collapsed: boolean;
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      className={cn(
        "overflow-hidden transition-[max-height,opacity,transform] ease-out",
        className,
        collapsed ? "max-h-0 -translate-x-1 opacity-0" : "max-h-24 translate-x-0 opacity-100",
      )}
      style={{ transitionDuration: `${COLLAPSE_DURATION_MS}ms` }}
    >
      {children}
    </Tag>
  );
}
