"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CornerDownLeft, Plus, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { primaryNav, askNav, settingsNav, type NavItem } from "@/lib/nav";
import type { TaskDTO } from "@/lib/tasks/types";

/**
 * Global quick-capture/navigation palette (Cmd/Ctrl+K from anywhere in the dashboard shell —
 * mounted once in app/(dashboard)/layout.tsx). ROADMAP.md flagged this as the last open
 * "polish gap"; scoped to the two highest-value actions rather than everything a full
 * command palette could do:
 *
 *   1. Jump to any nav destination without reaching for the mouse.
 *   2. Quick-add a task from anywhere — the one universal, always-relevant capture action.
 *      List items, pet events, etc. already have fast per-page "add" forms once you're on
 *      that page (see DECISIONS.md ADR-011); this isn't trying to replace those, just cover
 *      the "I thought of something, let me jot it down" case without navigating first.
 *
 * Deliberately hand-rolled instead of pulling in `cmdk`/Radix — no overlay/portal primitive
 * existed anywhere in the codebase yet (see DECISIONS.md), and this doesn't need virtualized
 * lists, multi-select, or nested pages, so a small bespoke component is the "smallest
 * coherent increment" per CLAUDE.md rather than introducing a new UI dependency for one
 * consumer.
 *
 * No AI/natural-language parsing here — ADR-049 gestures at an eventual NL-driven Quick Add,
 * but the agent's write tools don't exist yet (Milestone 8, not built), and "functionality
 * without AI" is the stated preference. This is deterministic: exact task title in, exact
 * task title out.
 */

const OPEN_EVENT = "lifeos:open-command-palette";

/** Imperatively opens the palette from anywhere (e.g. the sidebar's mouse-accessible trigger)
 *  without needing a shared context provider — matches the "simple architecture" preference. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type NavResult = { kind: "nav"; item: NavItem };
type QuickAddResult = { kind: "quick-add"; title: string };
type Result = NavResult | QuickAddResult;

const ALL_NAV: NavItem[] = [...primaryNav, askNav, settingsNav];

export function CommandPalette() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTask = useMutation<{ task: TaskDTO }, ApiError, string>({
    mutationFn: (title) => apiFetch<{ task: TaskDTO }>("/api/tasks", { method: "POST", body: JSON.stringify({ title }) }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setJustAdded(data.task.title);
      setQuery("");
      window.setTimeout(() => setOpen(false), 900);
    },
  });
  const resetMutation = addTask.reset;

  const results = useMemo<Result[]>(() => {
    const trimmed = query.trim();
    const navMatches = trimmed
      ? ALL_NAV.filter((item) => item.label.toLowerCase().includes(trimmed.toLowerCase()))
      : ALL_NAV;
    const quickAdd: Result[] = trimmed ? [{ kind: "quick-add", title: trimmed }] : [];
    return [...quickAdd, ...navMatches.map((item): Result => ({ kind: "nav", item }))];
  }, [query]);

  // useCallback with a stable dep list (state setters are stable; resetMutation is react-query's
  // own reset function, also stable across renders) so the effect below doesn't need to
  // re-subscribe its DOM listeners on every render.
  const resetAndOpen = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    setJustAdded(null);
    resetMutation();
    setOpen(true);
    // Let the panel mount before focusing.
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [resetMutation]);

  // Global Cmd/Ctrl+K, from any page — the whole point of a *global* palette. Also listens
  // for the sidebar's click-to-open trigger via a plain DOM event (see openCommandPalette).
  // Re-subscribes whenever `open`/`resetAndOpen` change so the handlers close over the
  // current value (cheap — just two DOM listeners) rather than reading a ref during render,
  // which the lint config here (React Compiler rules) disallows. All state updates happen
  // inside these DOM event callbacks, not synchronously in the effect body itself.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          resetAndOpen();
        }
      }
    }
    function onOpenEvent() {
      if (!open) resetAndOpen();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, [open, resetAndOpen]);

  function onQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  function activate(result: Result) {
    if (result.kind === "nav") {
      setOpen(false);
      router.push(result.item.href);
    } else {
      addTask.mutate(result.title);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) activate(result);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Quick add and navigation"
      >
        {justAdded ? (
          <div className="flex items-center gap-2 px-4 py-4 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4 shrink-0" />
            Added &quot;{justAdded}&quot; to Tasks
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Add a task, or jump to a page…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto py-1">
              {results.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-neutral-400">Nothing matches.</p>
              )}
              {results.map((result, i) => (
                <ResultRow
                  key={result.kind === "nav" ? result.item.href : "quick-add"}
                  result={result}
                  active={i === activeIndex}
                  pending={result.kind === "quick-add" && addTask.isPending}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => activate(result)}
                />
              ))}
            </div>

            {addTask.isError && (
              <p className="border-t border-neutral-200 px-4 py-2 text-xs text-red-600 dark:border-neutral-800">
                {addTask.error.message}
              </p>
            )}

            <div className="flex items-center gap-3 border-t border-neutral-200 px-4 py-2 text-xs text-neutral-400 dark:border-neutral-800">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> select
              </span>
              <span>esc close</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  result,
  active,
  pending,
  onMouseEnter,
  onClick,
}: {
  result: Result;
  active: boolean;
  pending: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const Icon = result.kind === "nav" ? result.item.icon : Plus;
  const label = result.kind === "nav" ? result.item.label : `Add task: "${result.title}"`;

  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors disabled:opacity-60",
        active ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
      <span className="truncate">{label}</span>
      {result.kind === "nav" && <span className="ml-auto shrink-0 text-xs text-neutral-400">Go to</span>}
    </button>
  );
}
