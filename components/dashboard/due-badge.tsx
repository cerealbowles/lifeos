import { Badge } from "@/components/ui/badge";
import type { DueSummary } from "@/lib/tasks/status";
import type { CandidateDomain } from "@/lib/today/ranking";

export function DueBadge({ due, domain, live }: { due: DueSummary; domain?: CandidateDomain; live?: boolean }) {
  // DECISIONS.md ADR-107 — a live game's kickoff time has already passed, so the normal
  // due-badge math below would read "Today"/"Xd ago"; "LIVE" is more informative and is the
  // whole reason the game crossed into NOW in the first place.
  if (live) return <Badge variant="overdue">LIVE</Badge>;

  if (due.status === "none" || due.daysDelta === undefined) return null;

  // A game has a kickoff time, not an obligation — "Due"/"overdue" implies something the user
  // owes an action on, which doesn't fit a scheduled sports event.
  const isSports = domain === "sports";

  if (due.status === "overdue") {
    const days = due.daysDelta;
    if (isSports) return <Badge variant="overdue">{days === 0 ? "Today" : `${days}d ago`}</Badge>;
    return <Badge variant="overdue">{days === 0 ? "Due today" : `${days}d overdue`}</Badge>;
  }

  if (due.status === "due_soon") {
    const days = -due.daysDelta;
    if (isSports) return <Badge variant="due">{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days}d`}</Badge>;
    return <Badge variant="due">{days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days}d`}</Badge>;
  }

  return null;
}
