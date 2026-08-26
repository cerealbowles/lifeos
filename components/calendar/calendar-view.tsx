"use client";

import { useState } from "react";
import { addMonths, addWeeks, format, subMonths, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgendaList } from "./agenda-list";
import { MonthGrid } from "./month-grid";
import { WeekGrid } from "./week-grid";

type View = "agenda" | "week" | "month";
const VIEWS: { key: View; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "agenda", label: "Agenda" },
];

/**
 * Owns which of the three calendar views is showing and, for Week/Month, which period is
 * currently in frame — plain client-side state, no URL/deep-linking, since this is a single
 * page with no cross-session need to resume on a specific month (ROADMAP.md's "Calendar
 * month/week grid views" item). Agenda (the original, default-since-launch view) stays
 * unchanged and gets no prev/next controls — it's a flat forward-looking window, not a
 * period you page through.
 */
export function CalendarView() {
  const [view, setView] = useState<View>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  function goToPrevious() {
    setAnchorDate((d) => (view === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  }
  function goToNext() {
    setAnchorDate((d) => (view === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm transition-colors",
                view === key
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {view !== "agenda" && (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="Previous" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-[9rem] text-center text-sm font-medium">
              {view === "week" ? format(anchorDate, "'Week of' MMM d") : format(anchorDate, "MMMM yyyy")}
            </p>
            <Button type="button" variant="ghost" size="icon" aria-label="Next" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAnchorDate(new Date())}>
              Today
            </Button>
          </div>
        )}
      </div>

      {view === "agenda" && <AgendaList />}
      {view === "week" && <WeekGrid anchorDate={anchorDate} />}
      {view === "month" && <MonthGrid anchorDate={anchorDate} />}
    </div>
  );
}
