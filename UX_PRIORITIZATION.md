# Today Ranking &amp; Suppression (v1)

Concrete algorithm behind DECISIONS.md ADR-011, refined by the 2026-08-12 calm-computing
direction (DECISIONS.md ADR-039–072, source: `docs/CALM_COMPUTING_DECISIONS.md`) — see
"Calm-computing framing" below for how the two relate. Implemented in `lib/today/ranking.ts`
(pure, unit-tested) and called from `lib/today/service.ts`.

This is a v1: it runs entirely on data LifeOS already has (due dates, priority, domain).
Context-awareness (time of day, location) and user-preference weighting are named in
ADR-011/ADR-053 as part of the eventual model but are **not implemented** — there's no
signal source for either yet. Don't fake them with hardcoded weights; add them when there's a
real input (a preferences UI, a location signal, etc.) to drive them.

## Candidates

A candidate is any record that can compete for NOW/TODAY attention:

- Open tasks (`status` in `todo`, `in_progress`)
- Active routines
- Pet events not yet completed
- Financial reminders
- Calendar events (via `lib/calendar/`)
- Favorite-team sports games, scheduled only (via `lib/sports/`) — see the domain-vs-context
  note below; games are TODAY-tier by design, never NOW, per DECISIONS.md ADR-036/065.

**Lists are not ranked candidates.** They have no due date and aren't "urgent" in the same
sense — they're persistent utility. Today shows a separate, unranked strip of lists that
currently have unchecked items, and omits it entirely when every list is empty or fully
checked. This is a deliberate scope line, not an oversight.

**Weather is not a ranked candidate either** — it's rendered directly on Today from
`lib/weather/`, outside the scoring pipeline, since a single current-conditions snapshot
doesn't need urgency/importance scoring the way a list of discrete events does.

**Feed (RSS) is deliberately never a ranked candidate.** Per DECISIONS.md ADR-020/024/038,
interest content belongs in a distinct FEED attention tier, kept out of NOW/TODAY entirely so
an article never competes with an obligation for the same space — see ADR-051 (obligations
vs. interests). `/feed` is its own page, not a Today group.

A candidate with no due date, or a due date more than 14 days out, is excluded from both NOW
and TODAY — it only shows up when the user browses the owning domain directly (EVERYTHING).

## Scoring

`score = urgencyPoints(due) + importancePoints(candidate) + exceptionBonus(due)`

**Urgency** (from `lib/tasks/status.ts`'s due classification):

| Due status | Points |
|---|---|
| Overdue | 60, +4 per additional day overdue, capped at 100 |
| Due today or tomorrow | 45 |
| Due in 2–3 days | 30 |
| Due in 4–14 days | 10 |
| No due date, or &gt;14 days out | not a candidate |

**Importance** (domain + attributes):

| Source | Points |
|---|---|
| Financial reminder | 20 |
| Pet event — medication / vet_appointment / vaccination | 15 |
| Pet event — other | 5 |
| Task, priority `high` | 15 |
| Task, priority `medium` | 8 |
| Task, priority `low` or unset | 3 |
| Routine | 8 |

**Exception bonus:** +15 if overdue, on top of the urgency points above. Overdue is treated
as an unusual state worth surfacing regardless of how "important" the underlying item is.

## Bucketing

- **NOW** — candidates scoring ≥ 70, sorted by score descending, **capped at 5**. If more
  than 5 qualify, the excess falls through to TODAY rather than disappearing — the cap keeps
  NOW small enough to actually look at, it doesn't hide work. This cap *is* the current
  implementation of DECISIONS.md ADR-063's "attention budget" concept — see below.
- **TODAY** — every other candidate (score > 0, i.e. within the 14-day lookahead) not already
  in NOW, grouped by domain, each group capped at 8 items. A domain group is only rendered
  when it has at least one item — **no empty cards, ever** (the literal requirement in
  ADR-011).
- **EVERYTHING** — not computed by the ranking engine at all. It's the rest of the app:
  `/home` (tasks + routines), `/lists`, `/pets`, `/money`, `/calendar`, `/sports` for
  unranked, unfiltered browsing.
- **FEED** — also not computed by the ranking engine; `/feed` is a flat, unranked,
  reverse-chronological list across subscriptions. Deliberately outside this whole pipeline —
  see the Candidates section above.

## Suppression rules

1. No due date → never in NOW/TODAY.
2. More than 14 days out → never in NOW/TODAY (lookahead window).
3. NOW hard-capped at 5, regardless of how many items cross the 70-point threshold.
4. A TODAY domain group renders only when non-empty.
5. The Lists strip renders only when at least one list has an unchecked item.
6. A domain with no data to rank (e.g. weather never connected, no favorite teams followed)
   is absent entirely, rather than showing a placeholder card on Today.

## Calm-computing framing (DECISIONS.md ADR-039–072)

The 2026-08-12 calm-computing/attention-design direction reframes several things this doc
already does, and names some things it doesn't do yet. Mapping the two together:

- **Importance vs. urgency as separate axes (ADR-064).** Already the actual shape of the
  code — `score = urgencyPoints(due) + importancePoints(candidate) + exceptionBonus(due)`
  computes these independently and sums them. ADR-064 additionally proposes named importance
  tiers (CRITICAL/HIGH/NORMAL/LOW/AMBIENT) instead of the current per-domain point values
  (financial reminder = 20, routine = 8, etc.) — worth considering if the scorer ever needs
  to be more legible to a non-engineer, but not required by anything today.
- **Context determines placement, not domain (ADR-065).** Already implemented for one case:
  Sports importance is deliberately low (6 points) so a game never crosses into NOW
  regardless of urgency — see ADR-036. The general principle (the same domain can be ambient
  *or* urgent depending on the specific instance, e.g. ordinary weather vs. weather during a
  planned outdoor event) isn't implemented beyond that one case, since there's no per-instance
  context signal (like "user has an outdoor event today") wired into weather scoring yet.
- **Attention budget (ADR-063).** The NOW cap (5) and per-domain TODAY cap (8) already *are*
  a budget in the sense of a hard ceiling. What ADR-063 describes beyond that — grouping
  several related low-priority items into one compressed insight when the budget is
  exceeded, rather than just truncating by score — is **not implemented**. Today, excess
  NOW-eligible items silently fall through to TODAY; they aren't summarized into anything.
- **No unread counts (ADR-043) — fixed.** `components/dashboard/at-a-glance.tsx` /
  `buildGlanceSummary()` (renamed from `buildGlanceStats`) now render one compressed sentence
  ("This week: 2 tasks, 1 routine, and 1 bill.") instead of a strip of per-domain count
  badges. `TodayOverview.glanceSummary: string | null`.
- **Completion restores calm (ADR-044) — fixed.** Completing an item still just triggers a
  re-render from current data (no queued backlog to pull from), and now `NowList` /
  `TodayGroups` explicitly render "All done." / "Nothing else today." when they empty out,
  instead of silently rendering nothing.
- **Explain the recommendation (ADR-066).** Not applicable yet — the ranking engine doesn't
  currently generate any explained recommendation (like "skip watering because..."); it only
  ranks existing records. Relevant once a first true recommendation feature is built.

## Explicitly deferred

- **Context** (time of day, location, "what's already visible elsewhere right now") — no
  signal source exists yet. See ADR-045 (UI adapts to rhythm of day) for the eventual design
  target.
- **User preference weighting** — no per-domain/per-item weight is user-configurable yet.
  See ADR-053/054 for how this should be bounded once built (inspectable, reversible,
  bounded, never silently suppressing high-impact categories).
- **Acknowledged/dismissed suppression** — "I've seen this, stop resurfacing it" needs a
  `dismissed_at`-style column or table that doesn't exist yet. Today, the only way an item
  stops being ranked is by being acted on (completed, rescheduled past the lookahead window).
- **Learned importance** (spec §28, habit learning from purchase/completion intervals) —
  future; would feed into `importancePoints` once built. See ADR-053/054.
- **Attention-budget grouping/compression** (ADR-063) — today's caps truncate by score; they
  don't merge overflow items into one summarized insight the way ADR-019/063 describe.

Revisit this doc, not just the code, when any of the above gets built — the algorithm is
meant to grow inputs, not get overridden by ad hoc logic elsewhere.
