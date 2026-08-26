import { describe, expect, it } from "vitest";
import { addDays, subDays } from "date-fns";
import { bucketCandidates, derivePulseState, scoreCandidate, type CandidateInput, type RankedItem } from "./ranking";

const NOW = new Date("2026-08-11T12:00:00Z");

describe("scoreCandidate", () => {
  it("excludes candidates with no due date", () => {
    const input: CandidateInput = { id: "1", domain: "task", title: "Someday", dueAt: null, priority: null };
    expect(scoreCandidate(input, NOW)).toBeNull();
  });

  it("excludes candidates due more than 14 days out", () => {
    const input: CandidateInput = {
      id: "1",
      domain: "task",
      title: "Far future",
      dueAt: addDays(NOW, 15),
      priority: "high",
    };
    expect(scoreCandidate(input, NOW)).toBeNull();
  });

  it("scores an overdue high-priority task high enough for NOW", () => {
    const input: CandidateInput = {
      id: "1",
      domain: "task",
      title: "Overdue task",
      dueAt: subDays(NOW, 2),
      priority: "high",
    };
    const result = scoreCandidate(input, NOW);
    expect(result?.due.status).toBe("overdue");
    // urgency 60 + 2*4 = 68, importance 15, exception 15 => 98
    expect(result?.score).toBe(98);
  });

  it("scores a low-priority task due next week lower, staying in TODAY range", () => {
    const input: CandidateInput = {
      id: "1",
      domain: "task",
      title: "Someday-ish task",
      dueAt: addDays(NOW, 5),
      priority: "low",
    };
    const result = scoreCandidate(input, NOW);
    // urgency 10, importance 3, exception 0 => 13
    expect(result?.score).toBe(13);
  });

  it("gives financial reminders more importance weight than routines", () => {
    const dueAt = addDays(NOW, 10);
    const financial = scoreCandidate({ id: "f", domain: "financial", title: "Bill", dueAt }, NOW);
    const routine = scoreCandidate({ id: "r", domain: "routine", title: "Chore", dueAt }, NOW);
    expect(financial!.score).toBeGreaterThan(routine!.score);
  });

  it("weights medication/vet pet events higher than other pet events", () => {
    const dueAt = addDays(NOW, 1);
    const medication = scoreCandidate(
      { id: "p1", domain: "pet", title: "Meds", dueAt, eventType: "medication", subtitle: "Milo" },
      NOW,
    );
    const grooming = scoreCandidate(
      { id: "p2", domain: "pet", title: "Groom", dueAt, eventType: "grooming", subtitle: "Milo" },
      NOW,
    );
    expect(medication!.score).toBeGreaterThan(grooming!.score);
  });

  it("scores calendar events with location carried through as subtitle", () => {
    const input: CandidateInput = {
      id: "c1",
      domain: "calendar",
      title: "Dentist",
      dueAt: NOW,
      subtitle: "Bright Dental",
    };
    const result = scoreCandidate(input, NOW);
    expect(result?.subtitle).toBe("Bright Dental");
    // due_soon (today, daysUntil 0) => 45 urgency + 18 importance = 63
    expect(result?.score).toBe(63);
  });

  it("weights calendar events above routines but below financial", () => {
    const dueAt = addDays(NOW, 5);
    const calendar = scoreCandidate({ id: "c1", domain: "calendar", title: "Meeting", dueAt }, NOW);
    const routine = scoreCandidate({ id: "r1", domain: "routine", title: "Chore", dueAt }, NOW);
    const financial = scoreCandidate({ id: "f1", domain: "financial", title: "Bill", dueAt }, NOW);
    expect(calendar!.score).toBeGreaterThan(routine!.score);
    expect(calendar!.score).toBeLessThan(financial!.score);
  });

  it("keeps sports games out of NOW even when due today (ADR-024: TODAY-tier, not NOW)", () => {
    const game = scoreCandidate(
      { id: "g1", domain: "sports", title: "Cardinals @ Cubs", dueAt: NOW, subtitle: "MLB" },
      NOW,
    );
    // due_soon (today) => 45 urgency + 6 importance = 51, well under the NOW threshold (70)
    expect(game!.score).toBe(51);
    expect(game!.score).toBeLessThan(70);
  });

  it("crosses a LIVE favorite-team game into NOW (DECISIONS.md ADR-107)", () => {
    const liveGame = scoreCandidate(
      { id: "g2", domain: "sports", title: "Rockies @ Cubs", dueAt: NOW, subtitle: "MLB", live: true },
      NOW,
    );
    expect(liveGame!.score).toBeGreaterThanOrEqual(70);
    expect(liveGame!.live).toBe(true);

    const notLiveGame = scoreCandidate(
      { id: "g3", domain: "sports", title: "Rockies @ Cubs", dueAt: NOW, subtitle: "MLB", live: false },
      NOW,
    );
    expect(notLiveGame!.score).toBeLessThan(70);
    expect(notLiveGame!.live).toBeFalsy();
  });

  it("elevates a pet birthday into NOW when it's today, but keeps it in TODAY further out", () => {
    const today = scoreCandidate(
      { id: "b1", domain: "pet", title: "Birthday — turns 5", dueAt: NOW, eventType: "birthday", subtitle: "Luna" },
      NOW,
    );
    // due_soon (today) => 45 urgency + 25 importance = 70, right at the NOW threshold
    expect(today!.score).toBe(70);
    expect(today!.score).toBeGreaterThanOrEqual(70);

    const nextWeek = scoreCandidate(
      {
        id: "b2",
        domain: "pet",
        title: "Birthday — turns 5",
        dueAt: addDays(NOW, 7),
        eventType: "birthday",
        subtitle: "Luna",
      },
      NOW,
    );
    // upcoming (7 days out) => 10 urgency + 25 importance = 35, stays in TODAY
    expect(nextWeek!.score).toBe(35);
    expect(nextWeek!.score).toBeLessThan(70);
  });

  it("scores a grow check the same as a routine (ADR-094: modeled on the Routines pattern)", () => {
    const dueToday = scoreCandidate({ id: "g1", domain: "grow", title: "Check Apple Fritter — day 58", dueAt: NOW }, NOW);
    const overdueRoutine = scoreCandidate({ id: "r1", domain: "routine", title: "Water plants", dueAt: subDays(NOW, 2) }, NOW);
    const overdueGrow = scoreCandidate({ id: "g2", domain: "grow", title: "Check White Widow — day 12", dueAt: subDays(NOW, 2) }, NOW);

    // due_soon (today) => 45 urgency + 8 importance = 53, same tier as a routine due today
    expect(dueToday!.score).toBe(53);
    expect(dueToday!.score).toBeLessThan(70);
    // Identical scoring formula/weight to routines at the same due-date — grow doesn't get
    // its own bespoke importance value.
    expect(overdueGrow!.score).toBe(overdueRoutine!.score);
  });
});

describe("bucketCandidates", () => {
  it("caps NOW at 5 items and overflows the rest into TODAY", () => {
    const inputs: CandidateInput[] = Array.from({ length: 8 }, (_, i) => ({
      id: `overdue-${i}`,
      domain: "task",
      title: `Overdue ${i}`,
      dueAt: subDays(NOW, 3),
      priority: "high",
    }));

    const { now, today } = bucketCandidates(inputs, NOW);
    expect(now).toHaveLength(5);
    expect(today.task).toHaveLength(3);
  });

  it("omits domain groups with no items", () => {
    const inputs: CandidateInput[] = [
      { id: "t1", domain: "task", title: "Task", dueAt: addDays(NOW, 5), priority: "low" },
    ];
    const { today } = bucketCandidates(inputs, NOW);
    expect(today.task).toHaveLength(1);
    expect(today.pet).toBeUndefined();
    expect(today.financial).toBeUndefined();
    expect(today.routine).toBeUndefined();
  });

  it("returns empty buckets when there are no candidates", () => {
    const { now, today } = bucketCandidates([], NOW);
    expect(now).toEqual([]);
    expect(Object.keys(today)).toHaveLength(0);
  });

  it("never double-counts an item in both NOW and TODAY", () => {
    const inputs: CandidateInput[] = [
      { id: "t1", domain: "task", title: "Overdue", dueAt: subDays(NOW, 5), priority: "high" },
      { id: "t2", domain: "task", title: "Upcoming", dueAt: addDays(NOW, 5), priority: "low" },
    ];
    const { now, today } = bucketCandidates(inputs, NOW);
    const nowIds = new Set(now.map((i) => i.id));
    const todayIds = new Set(Object.values(today).flat().map((i) => i.id));
    for (const id of nowIds) expect(todayIds.has(id)).toBe(false);
  });

  it("tracks overflow count when a domain has more than the TODAY group cap, instead of silently dropping items", () => {
    // Low-priority tasks due in a few days score well under the NOW threshold (70), so all
    // 12 land in TODAY, not NOW.
    const inputs: CandidateInput[] = Array.from({ length: 12 }, (_, i) => ({
      id: `low-${i}`,
      domain: "task",
      title: `Low priority ${i}`,
      dueAt: addDays(NOW, 4),
      priority: "low",
    }));

    const { today, overflow } = bucketCandidates(inputs, NOW);
    expect(today.task).toHaveLength(8);
    expect(overflow.task).toBe(4);
  });

  it("has no overflow entry for a domain that doesn't exceed its cap", () => {
    const inputs: CandidateInput[] = [
      { id: "t1", domain: "task", title: "Task", dueAt: addDays(NOW, 5), priority: "low" },
    ];
    const { overflow } = bucketCandidates(inputs, NOW);
    expect(overflow.task).toBeUndefined();
  });
});

describe("derivePulseState", () => {
  function item(overrides: Partial<RankedItem> = {}): RankedItem {
    return {
      id: "1",
      domain: "task",
      title: "Item",
      dueAt: NOW,
      due: { status: "due_soon", daysDelta: 0 },
      score: 80,
      ...overrides,
    };
  }

  it("is calm when both NOW and TODAY are empty", () => {
    expect(derivePulseState([], {})).toBe("calm");
  });

  it("is active when NOW is empty but TODAY has items", () => {
    expect(derivePulseState([], { task: [item()] })).toBe("active");
  });

  it("is attention when NOW has items, none overdue", () => {
    expect(derivePulseState([item()], {})).toBe("attention");
  });

  it("is urgent when any NOW item is overdue, even alongside non-overdue ones", () => {
    const overdue = item({ id: "2", due: { status: "overdue", daysDelta: 2 } });
    expect(derivePulseState([item(), overdue], {})).toBe("urgent");
  });

  it("prioritizes urgent over active/attention regardless of TODAY contents", () => {
    const overdue = item({ due: { status: "overdue", daysDelta: 1 } });
    expect(derivePulseState([overdue], { pet: [item()] })).toBe("urgent");
  });
});
