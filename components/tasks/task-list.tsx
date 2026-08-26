"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DueBadge } from "@/components/dashboard/due-badge";
import { CollapsibleItem } from "@/components/dashboard/collapsible-item";
import { useCollapseThen } from "@/lib/hooks/use-collapse-then";
import { getDueSummary } from "@/lib/tasks/status";
import { TASK_CATEGORIES } from "@/lib/db/schema";
import type { TaskDTO } from "@/lib/tasks/types";

const UNCATEGORIZED = "Uncategorized";

/**
 * DECISIONS.md ADR-093. Filter chips match the Now/Today/Everything segmented-pill style
 * (components/dashboard/mobile-today-tabs.tsx), not a new visual language. "All" (the
 * default) shows a grouped view with quiet typographic section headers per category — no
 * color-coding, per the explicit design principle ("keep it typographic/quiet") — and only
 * renders headers for categories that actually have tasks, not all five regardless of
 * content (the same "don't show empty state nobody asked for" instinct as everywhere else in
 * the app). Picking a specific chip switches to a flat filtered list.
 */
export function TaskList({ timezone }: { timezone: string }) {
  const queryClient = useQueryClient();
  const { collapseThen, isCollapsing } = useCollapseThen();
  const [filter, setFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<{ tasks: TaskDTO[] }>("/api/tasks"),
  });

  const complete = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  if (isLoading) return <p className="text-sm text-neutral-400">Loading tasks…</p>;

  const tasks = data?.tasks ?? [];
  if (tasks.length === 0) {
    return <p className="text-sm text-neutral-400">No open tasks. Add one above.</p>;
  }

  function renderTask(task: TaskDTO) {
    return (
      <CollapsibleItem key={task.id} collapsed={isCollapsing(task.id)}>
        <div className="flex items-center gap-3 py-2">
          <Checkbox
            checked={false}
            disabled={complete.isPending}
            onChange={() => collapseThen(task.id, () => complete.mutate(task.id))}
          />
          <span className="flex-1 text-sm">{task.title}</span>
          <DueBadge due={getDueSummary(task.dueAt ? new Date(task.dueAt) : null, timezone)} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => collapseThen(task.id, () => remove.mutate(task.id))}
            aria-label={`Delete ${task.title}`}
          >
            <Trash2 className="h-4 w-4 text-neutral-400" />
          </Button>
        </div>
      </CollapsibleItem>
    );
  }

  const filtered = filter ? tasks.filter((t) => t.category === filter) : tasks;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-fit flex-wrap gap-1 rounded-full bg-neutral-100 p-1 text-xs dark:bg-neutral-800">
        <FilterChip label="All" active={filter === null} onClick={() => setFilter(null)} />
        {TASK_CATEGORIES.map((c) => (
          <FilterChip key={c} label={c} active={filter === c} onClick={() => setFilter(c)} />
        ))}
      </div>

      {filter ? (
        filtered.length === 0 ? (
          <p className="text-sm text-neutral-400">No {filter.toLowerCase()} tasks.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">{filtered.map(renderTask)}</ul>
        )
      ) : (
        <GroupedTasks tasks={tasks} renderTask={renderTask} />
      )}
    </div>
  );
}

function GroupedTasks({ tasks, renderTask }: { tasks: TaskDTO[]; renderTask: (task: TaskDTO) => React.ReactNode }) {
  // A task's stored category can be something outside the current fixed set (existing data
  // from before this set was fixed, or a value assigned some other way) — group those under
  // their own real label rather than folding them into "Uncategorized" (which would
  // misrepresent them) or, worse, silently filtering them out of view entirely. Order: the
  // 5 fixed categories in their canonical order, then any other real values alphabetically,
  // then "Uncategorized" last.
  const knownCategories = new Set<string>(TASK_CATEGORIES);
  const otherCategories = [...new Set(tasks.map((t) => t.category).filter((c): c is string => !!c && !knownCategories.has(c)))].sort();
  const groupOrder = [...TASK_CATEGORIES, ...otherCategories, UNCATEGORIZED];
  const groups = groupOrder
    .map((name) => ({ name, tasks: tasks.filter((t) => (t.category ?? UNCATEGORIZED) === name) }))
    .filter((g) => g.tasks.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.name}>
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
            {group.name}
          </h3>
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {group.tasks.map(renderTask)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 font-medium transition-colors",
        active
          ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
          : "text-neutral-500 dark:text-neutral-400",
      )}
    >
      {label}
    </button>
  );
}
