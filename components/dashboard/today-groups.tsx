import { Card, CardContent } from "@/components/ui/card";
import { TodayGroupCard } from "./today-group-card";
import { TodayTasksCard } from "./today-tasks-card";
import type { CandidateDomain, PulseState, RankedItem } from "@/lib/today/ranking";

const GROUP_ORDER: CandidateDomain[] = ["calendar", "task", "routine", "pet", "financial", "sports", "grow"];

export function TodayGroups({
  groups,
  overflow,
  pulse,
  timezone,
}: {
  groups: Partial<Record<CandidateDomain, RankedItem[]>>;
  overflow: Partial<Record<CandidateDomain, number>>;
  pulse: PulseState;
  timezone: string;
}) {
  const hasAny = GROUP_ORDER.some((domain) => (groups[domain] ?? []).length > 0);

  // DECISIONS.md ADR-044/062 — an empty TODAY is a successful state worth a short, calm
  // confirmation, not just a gap between the NOW card and Lists/Health below it. Individual
  // domain groups still follow ADR-011's "no empty cards, ever" — this only covers the case
  // where every group is empty. Suppressed entirely when pulse === "calm" (NOW is also empty)
  // — Life Pulse already owns that message once at the top; see NowList for the same rule.
  if (!hasAny) {
    if (pulse === "calm") return null;
    return (
      <Card className="animate-settle">
        <CardContent className="py-4 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nothing else today.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <TodayGroupCard
        domain="calendar"
        title="Calendar"
        items={groups.calendar ?? []}
        overflow={overflow.calendar}
        timezone={timezone}
      />
      <TodayTasksCard items={groups.task ?? []} overflow={overflow.task} timezone={timezone} />
      <TodayGroupCard
        domain="routine"
        title="Routines"
        items={groups.routine ?? []}
        overflow={overflow.routine}
        timezone={timezone}
      />
      <TodayGroupCard domain="pet" title="Pets" items={groups.pet ?? []} overflow={overflow.pet} timezone={timezone} />
      <TodayGroupCard
        domain="financial"
        title="Money"
        items={groups.financial ?? []}
        overflow={overflow.financial}
        timezone={timezone}
      />
      <TodayGroupCard
        domain="sports"
        title="Sports"
        items={groups.sports ?? []}
        overflow={overflow.sports}
        timezone={timezone}
      />
      <TodayGroupCard
        domain="grow"
        title="Grow"
        items={groups.grow ?? []}
        overflow={overflow.grow}
        timezone={timezone}
      />
    </div>
  );
}
