"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DECISIONS.md ADR-124 ("full detail stays one tap away") — a lightweight overlay for viewing
 * and acting on a single item without leaving Home: bottom sheet on mobile, centered dialog on
 * desktop. Reuses `animate-settle` (Motion Principles/ADR-074) for the one-shot entrance rather
 * than inventing a new transition; closes on backdrop click, the X button, or Escape.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-settle relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_24px_-16px_rgba(0,0,0,0.3)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.03),0_12px_28px_-16px_rgba(0,0,0,0.6)] sm:max-w-md sm:rounded-2xl",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 p-4 dark:border-neutral-800">
          <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
