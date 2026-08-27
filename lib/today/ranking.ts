import { getDueSummary, type DueSummary } from "@/lib/tasks/status";
import type { PetEventType } from "@/lib/db/schema";
import type { GameDTO } from "@/lib/sports/types";

/**
 * Implements the algorithm in UX_PRIORITIZATION.md. Keep the two in sync —
 * this file is the executable version of that doc, not an independent design.
 */

export type CandidateDomain = "task" | "routine" | "pet" | "financial" | "calendar" | "sports" | "grow";

type BaseCandidateInput = {
  id: string;
  title: string;
  dueAt: Date | null;
  /**
   * Deep link to this item's own record, when one exists (e.g. a specific pet or grow plant
   * page) — falls back to the domain's hub page (`domainMeta(domain).href`) when omitted.
   * Only worth setting for domains with a real per-record detail page; task/routine/financial/
   * calendar/sports have no such page today, so their candidates leave this unset.
   */
  href?: string;
};

export type TaskCandidateInput = BaseCandidateInput & {
  domain: "task";
  priority: "low" | "medium" | "high" | null;
};

export type RoutineCandidateInput = BaseCandidateInput & {
  domain: "routine";
};

export type PetCandidateInput = BaseCandidateInput & {
  domain: "pet";
  // "birthday" is not a real pet_events row/eventType — see lib/pets/birthday.ts. Widened
  // here only, not in the DB schema's PetEventType, so it can't leak into the "add event"
  // UI as a manually-loggable type.
  eventType: PetEventType | "birthday";
  subtitle: string;
};

export type FinancialCandidateInput = BaseCandidateInput & {
  domain: "financial";
};

export type CalendarCandidateInput = BaseCandidateInput & {
  domain: "calendar";
  subtitle?: string;
};

export type SportsCandidateInput = BaseCandidateInput & {
  domain: "sports";
  subtitle?: string;
  /** DECISIONS.md ADR-107 — a currently-in-progress game for a favorited team. Crosses into
   *  NOW (see importancePoints below); a merely scheduled game does not. */
  live?: boolean;
  /** The full game record, so the Home detail sheet can show score/odds/boxscore without a
   *  second fetch — sports has no stable per-game id/route to look one back up by. */
  game?: GameDTO;
};

export type GrowCandidateInput = BaseCandidateInput & {
  domain: "grow";
};

export type CandidateInput =
  | TaskCandidateInput
  | RoutineCandidateInput
  | PetCandidateInput
  | FinancialCandidateInput
  | CalendarCandidateInput
  | SportsCandidateInput
  | GrowCandidateInput;

export type RankedItem = {
  id: string;
  domain: CandidateDomain;
  title: string;
  subtitle?: string;
  dueAt: Date | null;
  due: DueSummary;
  score: number;
  /** See BaseCandidateInput.href. */
  href?: string;
  /** Only set for domain === "pet". DECISIONS.md ADR-100 — "birthday" is a computed
   *  occurrence with no underlying pet_events row, so it's the one pet-domain NOW item that
   *  can't be swipe-completed; real event types can. */
  eventType?: PetEventType | "birthday";
  /** Only set for domain === "sports" — see SportsCandidateInput.live. */
  live?: boolean;
  /** Only set for domain === "sports" — see SportsCandidateInput.game. */
  game?: GameDTO;
};

const NOW_THRESHOLD = 70;
const NOW_CAP = 5;
const TODAY_GROUP_CAP = 8;
const HIGH_VALUE_PET_EVENTS: PetEventType[] = ["medication", "vet_appointment", "vaccination"];

function urgencyPoints(due: DueSummary): number {
  if (due.status === "none" || due.daysDelta === undefined) return 0;

  if (due.status === "overdue") {
    return Math.min(60 + due.daysDelta * 4, 100);
  }

  const daysUntil = -due.daysDelta;

  if (due.status === "due_soon") {
    return daysUntil <= 1 ? 45 : 30;
  }

  // upcoming
  return daysUntil <= 14 ? 10 : 0;
}

function importancePoints(input: CandidateInput): number {
  switch (input.domain) {
    case "financial":
      return 20;
    case "calendar":
      // A scheduled appointment is a firm commitment at a specific time — weighted close
      // to financial obligations. No per-event priority data comes from CalDAV to refine this.
      return 18;
    case "pet":
      // Deliberately higher than every other pet-event importance (matched against
      // urgencyPoints' 45-point "due today/tomorrow" tier so a birthday only crosses into
      // NOW on the day itself or the day before — not weeks out, where it's ordinary
      // TODAY-tier context like any other upcoming pet event). "Elevate on the date," not
      // "always elevated" — see DECISIONS.md.
      if (input.eventType === "birthday") return 25;
      return HIGH_VALUE_PET_EVENTS.includes(input.eventType) ? 15 : 5;
    case "sports":
      // Deliberately low — per DECISIONS.md ADR-024/ADR-036 a favorite team's game is
      // TODAY-tier ("nice to know"), not NOW-tier like an appointment or bill. DECISIONS.md
      // ADR-107 carves out one explicit exception: a game that's LIVE right now is a context
      // change (ADR-065's "same domain, different urgency by context") big enough to cross
      // into NOW — high enough on its own to guarantee that regardless of urgencyPoints'
      // due_soon/overdue split, which a live game can land in either side of depending on
      // exactly when "today" rolls over relative to kickoff.
      return input.live ? 70 : 6;
    case "task":
      if (input.priority === "high") return 15;
      if (input.priority === "medium") return 8;
      return 3;
    case "routine":
      return 8;
    case "grow":
      // Same weight as routines — DECISIONS.md ADR-094 explicitly models a grow check on the
      // Routines card pattern ("a 'due to check' reminder, not a form-heavy tracker"), so it
      // gets the same importance rather than a bespoke value.
      return 8;
  }
}

function exceptionBonus(due: DueSummary): number {
  return due.status === "overdue" ? 15 : 0;
}

/** Returns null for candidates excluded from NOW/TODAY entirely (no due date, or >14 days out). */
export function scoreCandidate(input: CandidateInput, now: Date = new Date(), timezone: string = "UTC"): RankedItem | null {
  const due = getDueSummary(input.dueAt, timezone, now);
  const urgency = urgencyPoints(due);
  if (urgency === 0) return null;

  return {
    id: input.id,
    domain: input.domain,
    title: input.title,
    subtitle:
      input.domain === "pet" || input.domain === "calendar" || input.domain === "sports"
        ? input.subtitle
        : undefined,
    dueAt: input.dueAt,
    due,
    score: urgency + importancePoints(input) + exceptionBonus(due),
    href: input.href,
    eventType: input.domain === "pet" ? input.eventType : undefined,
    live: input.domain === "sports" ? input.live : undefined,
    game: input.domain === "sports" ? input.game : undefined,
  };
}

export type TodayBuckets = {
  now: RankedItem[];
  today: Partial<Record<CandidateDomain, RankedItem[]>>;
  /**
   * DECISIONS.md ADR-063/079 (attention-budget grouping, v1) — how many additional items
   * exist per domain beyond TODAY_GROUP_CAP. Previously these were silently dropped with no
   * trace in the returned data at all; the UI now renders one small "+N more" line per
   * domain instead of a hard, unacknowledged cutoff. Not full thematic grouping (e.g. "Guests
   * Saturday — 3 house tasks, 2 shopping items") — that needs a notion of relatedness across
   * domains that doesn't exist in the data model yet. This is the simple version: a count,
   * not a synthesized insight.
   */
  overflow: Partial<Record<CandidateDomain, number>>;
};

export function bucketCandidates(inputs: CandidateInput[], now: Date = new Date(), timezone: string = "UTC"): TodayBuckets {
  const ranked = inputs
    .map((input) => scoreCandidate(input, now, timezone))
    .filter((item): item is RankedItem => item !== null)
    .sort((a, b) => b.score - a.score || (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));

  const nowItems = ranked.filter((item) => item.score >= NOW_THRESHOLD).slice(0, NOW_CAP);
  const nowIds = new Set(nowItems.map((item) => item.id));

  const today: Partial<Record<CandidateDomain, RankedItem[]>> = {};
  const overflow: Partial<Record<CandidateDomain, number>> = {};
  for (const item of ranked) {
    if (nowIds.has(item.id)) continue;
    const group = today[item.domain] ?? (today[item.domain] = []);
    if (group.length < TODAY_GROUP_CAP) {
      group.push(item);
    } else {
      overflow[item.domain] = (overflow[item.domain] ?? 0) + 1;
    }
  }

  return { now: nowItems, today, overflow };
}

/**
 * DECISIONS.md ADR-030/042/076 (Life Pulse) — one overall attention state for the whole day,
 * derived deterministically from the same NOW/TODAY buckets everything else uses (ADR-017:
 * prioritization is deterministic first, no separate judgment call here). Four states, most
 * severe wins:
 *
 * - "urgent"    — something in NOW is overdue (missed, not just due soon).
 * - "attention" — NOW has items, none of them overdue.
 * - "active"    — NOW is empty but TODAY has something (a normal day, nothing pressing).
 * - "calm"      — both NOW and TODAY are empty.
 */
export type PulseState = "calm" | "active" | "attention" | "urgent";

export function derivePulseState(now: RankedItem[], today: Partial<Record<CandidateDomain, RankedItem[]>>): PulseState {
  if (now.some((item) => item.due.status === "overdue")) return "urgent";
  if (now.length > 0) return "attention";
  if (Object.values(today).some((items) => (items?.length ?? 0) > 0)) return "active";
  return "calm";
}
