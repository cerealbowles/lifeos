# Roadmap

Tracking against the milestones defined in the
[product spec](docs/LIFEOS_PRODUCT_ENGINEERING_SPEC.md#63-mvp-milestones), refined by
[PRODUCT.md](PRODUCT.md) and [UX_PRIORITIZATION.md](UX_PRIORITIZATION.md), and — as of
2026-08-12 — the calm-computing direction in
[docs/CALM_COMPUTING_DECISIONS.md](docs/CALM_COMPUTING_DECISIONS.md) / DECISIONS.md
ADR-039–072 (see "Calm computing: adopted direction vs. open work" below), and as of
2026-08-26 the earth/landscape visual direction in
[docs/LANDSCAPE_VISUAL_DIRECTION.md](docs/LANDSCAPE_VISUAL_DIRECTION.md) / DECISIONS.md
ADR-109–125 (see "Landscape visual direction: adopted vs. open work" below).

- [x] **Milestone 0 — Foundation.** Next.js + TypeScript + Tailwind + Postgres + Drizzle +
      Docker Compose + auth (session-based, first-run setup) + dashboard shell + seed data.
- [x] **Milestone 1 — Tasks + Lists.** Tasks, routines (structured recurrence: interval /
      weekly / monthly_day), routine completion history, lists, list items, activity log.
- [x] **Milestone 2 — Today Dashboard.** `getTodayOverview()` aggregator plus a deterministic
      ranking/suppression engine (`lib/today/ranking.ts`) producing NOW (top-ranked, capped)
      and TODAY (grouped by domain, only domains with content) tiers — see DECISIONS.md
      ADR-011. No quick-add command palette yet — the per-page "add" forms cover this for
      now. Context-awareness and user-preference weighting are explicitly deferred (no data
      source for either yet); see UX_PRIORITIZATION.md.
- [x] **Milestone 3 — Weather.** OpenWeatherMap integration: connected from Settings (API key
      encrypted at rest, `lib/security/crypto.ts`), geocoded by postal code, current
      conditions + same-day forecast cached for 30 min (`weather_snapshots`), surfaced on
      Today only when connected. A simple deterministic garden hint ("rain expected, skip
      watering") derives from forecast precip chance/amount — the fuller rainfall-history
      accumulation and garden-zone logic from spec §13 needs snapshots collected over time
      (§39). A background job now exists to do exactly that (the `worker` service, "Polish
      gaps closed" below, ADR-088) — but the rainfall-history/garden-zone feature built on
      top of those accumulated snapshots is still not implemented. Sports still has no data
      source; `/sports` stays a placeholder.
- [x] **Milestone 4 — Pets.** Full CRUD: pet profiles (`/pets`), per-pet event timeline
      (`/pets/[id]`) with upcoming/history split. Events support the same structured
      recurrence as routines (`lib/tasks/recurrence.ts`, reused rather than duplicated) —
      completing a recurring event spawns the next instance, matching how routine
      completion works. Profile edit + delete UI landed later (see "polish gaps" below,
      DECISIONS.md ADR-081) — this milestone originally shipped create-only.
- [x] **Milestone 5 — Calendar.** iCloud via CalDAV (`tsdav` + `ical.js`), not Google — the
      user's actual iPhone-synced calendars, no native app required. App-specific password
      encrypted at rest, same pattern as weather. Sync is lazy-on-read (`lib/calendar/service.ts`),
      15-min TTL, upserts by `(calendar_account_id, external_id)` so re-syncing is safe. Manual
      event creation also works standalone, with or without a connected account. Agenda view
      only — month/week grid views deferred. A stale/revoked app-specific password degrades
      gracefully (banner + last-synced data) rather than breaking the page, per DECISIONS.md
      ADR-008's "usable without AI" principle extended to "usable without a healthy
      integration." Live CalDAV sync verified structurally; end-to-end sync against a real
      iCloud account needs the user's own app-specific password to test.
- [x] **Milestone 6 — Finance Reminders.** Full CRUD at `/money`: accounts and payment
      reminders. Added a field beyond the original spec — `statement_close_day` on
      `financial_accounts`, distinct from the payment due date, for paying down a balance
      before the statement generates. Dates (`next_due_at`, `next_statement_close_at`) are
      denormalized like routines' `next_due_at`, but bills/statements roll forward on their
      own schedule with no explicit "complete" action, so `lib/finance/service.ts` lazily
      recomputes and persists any stale date on read rather than requiring a background job.
      Deliberately obligation-tracking only, no bank connection — spec §16, DECISIONS.md
      ADR-006.
- [x] **Milestone 7 — AI Foundation.** Ollama adapter behind a provider-neutral
      `ModelProvider` interface (`lib/agent/providers/`), a read-only tool registry
      (`lib/agent/tools.ts`) covering today/tasks/routines/lists/pets/money/weather/calendar,
      an 8-iteration tool-call loop (`lib/agent/agent.ts`), full audit logging
      (`agent_actions`), and locally-persisted conversations (`agent_conversations`/
      `agent_messages` — not reliant on provider-side history, DECISIONS.md ADR-004). Chat UI
      at `/ask`. Default model is `llama3.2:3b` (small enough to pull/run without a GPU).
      Verified live end-to-end, including catching a real bug: tool handlers originally
      returned raw DB rows, and the noise was enough to make the 3B model return an empty
      final answer after a successful tool call — fixed by having every tool return a lean,
      hand-picked shape instead (DECISIONS.md ADR-035). CPU-only inference is slow — 20–60s
      per turn observed; no streaming yet, so the UI just shows "Thinking…" for the duration.
      Write tools (add task, check off list item, etc.) are Milestone 8, not this one.
- [x] **Milestone 7.5 — Sports.** ESPN's undocumented public site API (no key required),
      behind `EspnProvider` (`lib/sports/provider.ts`) — user picks a league from a fixed
      set (MLB/NFL/NBA/NHL/NCAAF/NCAAB) and searches by team name from Settings
      (`components/settings/sports-form.tsx`), no manual ID entry. `favorite_teams` is
      per-user; `sports_events` is a shared, provider-keyed cache (not user-scoped) so
      multiple users following the same team don't duplicate ESPN calls. Lazy-sync-on-read
      like weather/calendar, 30-min TTL (`lib/sports/service.ts`), one team's ESPN failure
      doesn't block the others (`.catch(() => undefined)` per team). Matches games on
      composite `(league, team_external_id)`, not `team_external_id` alone — ESPN's numeric
      IDs are only unique within one sport+league and collide across leagues otherwise.
      Wired into Today ranking as a new `sports` domain, deliberately low importance (score
      6) so a favorite team's game is TODAY-tier, never NOW-tier, even on game day —
      DECISIONS.md ADR-036. `/sports` lists real upcoming/recent games (final scores, live,
      or scheduled) once at least one team is followed. Verified live: all 7 requested teams
      (Rockies, Cubs, Bears, Blackhawks, Avalanche, Indiana Hoosiers football + basketball)
      added through the real UI, confirmed against live ESPN data on both `/sports` and the
      Today TODAY tab.
- [ ] **Milestone 8 — AI Actions.** Depends on Milestone 7 (done). Add `permissionLevel:
      "act"` tools (create_task, add_list_item, complete_routine, etc.) plus the
      confirmation-before-write UI the spec's Level 2/3 permission model implies — nothing
      in Milestone 7 needed that since every tool was read-only.
- [ ] **Milestone 9 — Semantic Memory.** Depends on Milestone 7; needs `pgvector` usage
      (extension is available via the `pgvector/pgvector:pg16` image already in use).
- [x] **Milestone 10 — PWA.** Installable via native Next.js conventions, no `next-pwa`
      dependency: `app/manifest.ts` (Web App Manifest), `app/icon.tsx`/`app/apple-icon.tsx`
      (favicon/iOS icon via `next/og` `ImageResponse`), `app/pwa-icon-192`/`-512` (explicit
      manifest icon routes), `public/sw.js` (hand-rolled ~50-line service worker, registered
      production-only). The service worker is deliberately not offline-first — `/api/*` and
      every non-GET request always bypass the cache and hit the network directly, since
      LifeOS is DB-backed (ADR-003) and serving stale data would be actively wrong. Its jobs
      are just installability + smoothing a flaky connection for the page shell (cache-first
      static assets, network-first-with-fallback navigation). `appleWebApp` metadata makes
      iOS "Add to Home Screen" launch standalone instead of a bookmark. See DECISIONS.md
      ADR-077. Mobile nav + safe-area padding were already in place from earlier milestones.
      **Finalized** (item 10, "Polish gaps closed" below): manifest `id`/`categories`/
      `shortcuts`, plus a self-suppressing custom "Install" button. Offline-first is still a
      deliberate non-goal, not a gap — see ADR-089.
- [x] **Milestone 12 — Attention-budget overflow (v1).** `bucketCandidates()` now returns
      `overflow` (per-domain count beyond `TODAY_GROUP_CAP`); `TodayGroupCard`/
      `TodayTasksCard` render a "+ N more" line (linking to the domain page) instead of a
      silent, unacknowledged cutoff — same one-line "compress instead of list" instinct as
      Life Pulse. `get_today_overview`'s agent tool exposes the counts too
      (`additionalItemsNotShown`). **Not** the full thematic grouping DECISIONS.md ADR-063
      originally described ("Guests Saturday — 3 house tasks, 2 shopping items, 1 setup
      task") — that needs a notion of relatedness across domains (e.g. linking "guests this
      weekend" to the tasks/shopping it implies) that doesn't exist in the data model. See
      DECISIONS.md ADR-079 for why the simple count version was the right scope for v1.
- [x] **Milestone 13 — Life Pulse (v1).** `lib/today/ranking.ts`'s `derivePulseState()`
      computes CALM/ACTIVE/ATTENTION/URGENT deterministically from existing NOW/TODAY data
      (unit tested); `components/dashboard/life-pulse.tsx` renders it as a small colored dot
      + one-line state description above the NOW/TODAY sections on both mobile and desktop,
      tap-to-expand into up to 3 "why" items reusing already-fetched data. No continuous
      animation (Motion Principles rule that out despite the name) — one-shot settle-in only.
      `NowList`/`TodayGroups` suppress their own calm messaging when pulse is calm, to avoid
      three stacked "nothing here" messages. See DECISIONS.md ADR-076. This is v1: it's a
      real DOM status readout (color + text), not literal orbital/spatial graphics — the
      source doc explicitly says that's not required. A deeper visual/spatial treatment
      (items moving, sizing, or positioning by relevance per ADR-041) is still open.
- [x] **Milestone 14 — Ambient Display (v1).** `/ambient` (`app/ambient/`) — a third
      presentation surface, own route + minimal layout outside `(dashboard)`, no Sidebar/nav
      at all. Live clock, current weather, up to 2 upcoming items (shown regardless of pulse
      — peripheral context, not an obligation list), and one attention line reusing
      `derivePulseState()`. Auto-refreshes every 5 minutes via `router.refresh()` since it's
      meant to be left open unattended. Linked from a small Settings card. Still
      session-authenticated like every other page — no kiosk/unauthenticated mode. See
      DECISIONS.md ADR-080. **Not tested on real ambient hardware** (old iPad, wall tablet) —
      only verified via browser preview at a reduced viewport; layout should hold up but
      hasn't been confirmed on an actual device.
- [ ] **Milestone 15 — Generative UI.** Not started (DECISIONS.md ADR-047/048). Lets `/ask`
      respond with a structured view (e.g. a rendered weekend summary) instead of only
      conversational text, built from a fixed set of application-defined primitives the
      model selects and composes. Depends on Milestone 8 (AI Actions) being solid first —
      this is a bigger step past that.
- [ ] **Milestone 16 — Family / multi-user households.** Not started (DECISIONS.md
      ADR-055/056). `user_id` already exists on every domain table (ADR-012), so this is
      additive, but needs real design work: visibility levels (PRIVATE/HOUSEHOLD/SELECTED/
      SYSTEM), per-member permissions the agent must also respect, and UI for a second
      household member. Large scope — not scheduled.
- [ ] **Milestone 17 — Media Sources (Navidrome / Jellyfin).** Not started (DECISIONS.md
      ADR-060/061). Would follow the same lazy-sync-on-read module pattern as Feed/Sports —
      most media info belongs in Feed, with context-based promotion into TODAY (e.g. a
      movie-night routine surfacing "Continue Severance" on a Friday evening).
- [ ] **Milestone 18 — Personalization / learned attention preferences.** Not started
      (DECISIONS.md ADR-053/054). Needs behavior tracking, an inspectable/reversible/bounded
      adjustment layer on top of the existing deterministic scorer, and hard floors on
      high-consequence categories (bills, medication, safety) that personalization can never
      suppress. No behavior-tracking data model exists yet.
- [x] **Milestone 11 — Feed (RSS).** `lib/feed/provider.ts` wraps `rss-parser` (handles both
      RSS and Atom) — subscribe by pasting any feed URL into Settings
      (`components/settings/feed-form.tsx`), no per-publisher integration needed, per
      DECISIONS.md ADR-025. `feed_subscriptions` is per-user; `feed_items` is a shared,
      non-user-scoped cache keyed on `(feed_url, guid)`, same reasoning as `sports_events` —
      the same article is the same row no matter who's subscribed. Lazy-sync-on-read, 30-min
      TTL, one feed's fetch failure doesn't block the others — identical pattern to
      weather/calendar/sports. Deliberately **not** wired into Today's NOW/TODAY ranking:
      DECISIONS.md ADR-020/024 place RSS/interest content in a distinct FEED tier, separate
      from NOW/TODAY by design (a Verge article shouldn't compete with an overdue task) — so
      `/feed` is its own page, reachable from the sidebar, not a Today card. User chose to
      seed starter feeds rather than ship empty: The Verge (tech news), BBC World News, and
      Hacker News, added live through the real UI and verified — `/feed` shows real, merged,
      time-sorted items from all three. No read/unread or save state yet (spec's fuller
      FeedItem shape from ADR-025 includes `read_at`/`saved_at`; deferred as a real gap, not
      an oversight — see DATA_MODEL.md).
- [x] **Milestone 19 — Challenges.** Not part of the original spec — a direct product
      request for a "75 Hard"-shaped feature: bounded multi-day, multi-habit programs with a
      daily checklist and a full history journal. Three new tables
      (`lib/db/schema/challenges.ts`: `challenges`/`challenge_habits`/`challenge_completions`),
      full CRUD at `/challenges` and `/challenges/[id]` (today's checklist plus a clickable
      habit × elapsed-day progress grid — any past day is correctable, not just today), and a
      self-suppressing `ChallengeCard` on the Today page (mobile + desktop) showing the
      single active challenge's day count and today's remaining habits. "Day N of D" is
      computed fresh from `start_date`, never stored. See DECISIONS.md ADR-091.
- [x] **Milestone 20 — Weight tracking.** `measurements` existed since Milestone 0 but had no
      write path or chart. `/health`'s `WeightCard` now has: an entry form (date + value,
      unit auto-set from `units_system`), a hand-rolled SVG line chart with a
      `30d`/`90d`/`6mo`/`12mo`/`All` range toggle (no charting library — styled entirely with
      the app's own accent color, ADR-090), and a recent-entries log with delete. Schema/
      service stay generic (`type` is free text) even though only weight has UI — a future
      measurement type is pure UI work, no migration. See DECISIONS.md ADR-092.

## Calm computing: adopted direction vs. open work (2026-08-12)

DECISIONS.md ADR-039 through ADR-072 merged in a large product-direction document (full
version: [docs/CALM_COMPUTING_DECISIONS.md](docs/CALM_COMPUTING_DECISIONS.md)). This was a
**docs merge, not an implementation pass** — most of it is accepted future direction, not
yet built. Splitting out what that means practically:

**Already consistent with current implementation** (no action needed): domains with nothing
relevant render no Today card (ADR-039/062, ADR-015); NOW is hard-capped rather than
unbounded (ADR-063's budget, partially); sports games stay TODAY-tier never NOW regardless of
urgency (ADR-036/065); AI tools return lean shapes, never raw rows (ADR-035, same spirit as
ADR-046 progressive disclosure); every domain table already carries `user_id` for eventual
multi-user (ADR-012, needed by ADR-055/056).

**Near-term conflicts — fixed same-day as the doc merge (2026-08-12):**

1. **Unread-count-style chips (ADR-043) — fixed.** `components/dashboard/at-a-glance.tsx` +
   `buildGlanceSummary()` in `lib/today/service.ts` (renamed from `buildGlanceStats`) now
   render one compressed sentence ("This week: 2 events, 3 tasks, and 1 bill.") instead of a
   strip of per-domain count badges. `TodayOverview.glanceSummary: string | null` replaces
   the old `glance: GlanceStat[]`.
2. **Feed had no "you're caught up" closure state (ADR-052) — fixed, then extended
   (ADR-075).** Added `users.feedLastViewedAt` (migration `0007_wide_roxanne_simpson.sql`) as
   a single per-user cursor — not full read/saved-per-item tracking (that's still deferred,
   see DATA_MODEL.md). `lib/feed/service.ts`'s `getFeedCatchUp()` splits items into
   new-since-last-visit vs. already-seen and advances the cursor on each fetch; `/feed` leads
   with "N new since your last visit — {digest}" / "You're caught up. Nothing new since you
   were last here." / "N items to catch up on." (first-ever visit), plus a "New" badge per
   item. The `{digest}` part was added afterward for the source doc's fuller Feed Philosophy
   framing — a per-subscription breakdown ("11 from Hacker News, 7 from The Verge, and 6 from
   BBC News") instead of just the bare total. Verified live: real digest sentence confirmed
   against actual subscribed feeds.
3. **No explicit "settled" treatment when NOW/TODAY empties out (ADR-044) — fixed.**
   `NowList` now renders an explicit "All done. / Nothing needs you right now." card instead
   of returning null when there's nothing in NOW; `TodayGroups` renders "Nothing else today."
   when every domain group is empty (individual empty domain groups still stay fully hidden
   per ADR-011 — this only covers the case where the whole tier is empty). The old page-level
   "Nothing needs your attention right now. Browse everything from the sidebar." banner in
   `app/(dashboard)/page.tsx` was removed — with NOW and TODAY each owning their own calm
   state now, keeping it too would have meant three separate "nothing here" messages stacked
   on an ordinary quiet day, which undoes the calm-computing point rather than serving it.
   Verified live: completed the last NOW item through the real Tasks page and confirmed the
   "All done." card renders on Today.
4. **Domain color was permanently vivid everywhere, including TODAY (Color Principles,
   unnumbered section of the source doc) — fixed.** `DomainAvatar` gained a `tone` prop:
   `NowList` (NOW) stays `"vivid"` (each domain's own bright color); `TodayGroupCard`/
   `TodayTasksCard` (TODAY) now use `"muted"` (one shared neutral gray circle for every
   domain). `DueBadge`'s amber/red urgency colors are untouched and now stand out more
   against the quieter TODAY avatars. Domain browsing pages outside Today (`/pets`, `/money`,
   `/calendar`, `/sports`) were deliberately left vivid — see DECISIONS.md ADR-073. This was
   a **color-only** pass — Motion Principles, Notification Philosophy, and the rest of the
   source doc's non-ADR sections were unaddressed at the time (see item 5).
5. **Motion Principles (unnumbered section of the source doc) — mostly fixed.** New
   `useCollapseThen()` + `CollapsibleItem` (`lib/hooks/use-collapse-then.ts` +
   `components/dashboard/collapsible-item.tsx`) make completed/deleted items shrink and fade
   out (220ms) before the mutation actually removes them, instead of an instant hard cut —
   wired into task complete/delete, pet event complete/delete, list item delete, and
   reminder/account/calendar-event delete. `routine-list.tsx` intentionally excluded — nothing
   ever leaves that list (routines always show, they just get re-dated). A new
   `animate-settle` CSS keyframe makes the "All done"/"Nothing else today" calm cards fade
   + rise in on mount instead of popping in. Confirmed no existing "avoid" list violations
   (`animate-pulse`/`animate-bounce`/`animate-ping`) anywhere in the codebase. **Two items
   from the source doc's "good uses" list remain open:** "related signals merge into one
   insight" (that's Milestone 12's attention-budget grouping, a content/logic feature, not a
   motion one) and "a detail view expands from its originating object" (needs the browser
   View Transitions API or a shared-element approach — real scope across every
   Today-item-to-detail-page navigation, deliberately not attempted in this pass). See
   DECISIONS.md ADR-074.

**Genuinely new, larger future scope** (see Milestones 12–18 above): generative UI,
family/multi-user, media Sources, and learned personalization. Life Pulse (Milestone 13),
attention-budget overflow (Milestone 12), and Ambient Display (Milestone 14) all got a v1 —
see below and above. The full thematic-grouping version of Milestone 12 (synthesizing "Guests
Saturday — 3 house tasks..." style insights, not just a count) remains unscheduled — it needs
cross-domain relatedness the data model doesn't have. None of the rest are scheduled; they're
recorded so future milestone planning has somewhere to start from rather than re-deriving
scope from the source document each time.

6. **Life Pulse v1 (Milestone 13) — built.** A deterministic CALM/ACTIVE/ATTENTION/URGENT
   status readout above NOW/TODAY, tap-to-expand into top reasons. Not the full "spatial,
   adaptive... not sidebar + cards" restructuring UI Direction describes — a real first step
   toward it (an attention-weighted visual anchor above the existing card stack), not the
   whole thing. See DECISIONS.md ADR-076 and Milestone 13 above for detail.
7. **PWA (Milestone 10) — built.** Installable app shell via native Next.js conventions —
   manifest, icons, a minimal non-offline-first service worker. See DECISIONS.md ADR-077 and
   Milestone 10 above for detail.

**Still open from this batch:** Notification Philosophy — the PWA infra a real notification
system would need now exists (service worker, installability), but the categorization system
itself (IMMEDIATE/TIME-SENSITIVE/DIGEST/SILENT, actual push subscriptions) is separate,
unbuilt work — and UI Direction's deeper spatial/adaptive restructuring (items visually
moving/sizing/positioning by relevance, ADR-041 — Life Pulse is a first step, not the full
picture).

## Landscape visual direction: adopted vs. open work (2026-08-26)

DECISIONS.md ADR-109 through ADR-125 merged in a reconciliation document (full version:
[docs/LANDSCAPE_VISUAL_DIRECTION.md](docs/LANDSCAPE_VISUAL_DIRECTION.md)) that took an
earth/landscape visual prototype and explicitly stripped out everything gamification-shaped
before adopting it — no Focus Score, no streak-dot habit grids, no numeric Life Pulse. Unlike
the calm-computing merge, this one shipped a real first implementation pass the same day, not
just docs.

**Built (2026-08-26):**

1. **Earth palette (ADR-109/110/119) — built.** Tailwind's `neutral-*` scale itself was
   redefined in `app/globals.css`'s `@theme` block (warm stone ramp, `950`/`900`/`800`/`400`/
   `200`/`100` anchored to the brief's named colors) rather than touching individual
   component files — the app already used `neutral-*` exclusively for chrome/text/borders
   (~700 occurrences), so this one file cascades everywhere, light and dark. `--accent`/
   `--accent-dark` moved from a desaturated blue to copper/warm-gold. Semantic colors (red/
   amber/emerald/sky for urgency, weather mood, health) were deliberately left alone per
   ADR-122.
2. **Materials (ADR-119) — built.** `components/ui/card.tsx` moved from `rounded-xl`/flat
   `shadow-sm` to `rounded-2xl` and a softer two-layer shadow — still one border, no
   glassmorphism.
3. **Editorial type (ADR-109) — built.** One serif font (`Fraunces`, `next/font/google`) added
   as `--font-serif` alongside the existing sans/mono vars, applied only to the Today page's
   date/greeting heading — not a global typography change.
4. **Environmental tinting (ADR-111) — adjusted.** `lib/theme/time-of-day.ts`'s afternoon
   gradient bucket moved off `sky-*` (a cool blue, at odds with "warmer earth tones" for
   afternoon) to `yellow-*`; morning/evening/night were already consistent once `neutral-*`
   warmed up.
5. **Today's date context (Today Design Direction) — built.** A new, deliberately
   non-interactive Mon–Sun week strip (`components/dashboard/week-strip.tsx`) below the
   greeting, today emphasized. Not a working multi-day switcher — `getTodayOverview`
   (`lib/today/service.ts`) is built entirely around "now"; generalizing the ranking pipeline
   to arbitrary dates is separate, larger, unscheduled work.

**Already consistent with the new ADRs, no change needed:** Life Pulse
(`components/dashboard/life-pulse.tsx`) was already a semantic CALM/ACTIVE/ATTENTION/URGENT
state, never a score (ADR-113); NOW/TODAY completion already settles toward "All done"/
"Nothing else today" rather than backfilling (ADR-116); Today was already the fixed mobile-nav
center (ADR-118, ADR-085); routines/health already surface as plain operational cards, not
streaks or scores (ADR-114).

**Explicitly not built this pass, and not accidentally implied by anything above:** a
separate immersive Home screen (ADR-112/117 describe Home as its own ambient/environmental
surface — the app has no distinct Home nav destination today, the Today page's own greeting
header plays that role; a real canvas/landscape Home is a sizable follow-on feature, closer to
the original prototype's own "Phase 2," not scheduled); Health's organic visualizations (moon
arc for sleep, path-like activity trends — Health Design Direction); Grow's progression
visuals (rings/paths/seasons for long-term consistency — Grow Design Direction); any
streak/consistency UI anywhere (deliberately out of scope per ADR-114/115, not merely
deferred).

## Polish gaps closed (2026-08-13)

Small, independent UX/UI gaps flagged across earlier milestones, picked up in a batch:

1. **Pets: edit + retire/restore UI — done.** `/pets/[id]` previously showed a static,
   unclickable name — no way to fix a typo or remove a pet. Added `updatePet()`/`retirePet()`/
   `unretirePet()` (`lib/pets/service.ts`), `PATCH`/`DELETE` on `/api/pets/[id]`, and an
   edit/retire header (`components/pets/pet-header.tsx`). Found and fixed a real bug in the
   process — `deletePet` already existed server-side but did a permanent `db.delete()`
   instead of using the `active` flag the schema already had for exactly this; since
   `pet_events` cascades on delete, that would have destroyed a pet's entire history the
   first time anyone actually clicked a delete button. Renamed "delete" to **Retire**
   specifically for pets (the main real-world reason to deactivate one is that they've
   passed away) and made retired pets stay visible in `/pets` with a "Retired" badge and a
   restore button, rather than disappearing — per explicit request. See DECISIONS.md
   ADR-081/082.
2. **Pet birthdays — done.** `lib/pets/birthday.ts` derives the next annual birthday +
   age-turning from `pets.birth_date` (not stored as an event — single source of truth).
   Feeds Today's ranking as a `pet`-domain candidate, weighted to cross into NOW only on the
   day itself/the day before, staying ordinary TODAY-tier context further out. Also shown on
   the pet's own page and exposed to the AI agent. See DECISIONS.md ADR-082.
3. **Lists: rename + delete UI — done.** `/lists/[id]` had no rename or delete capability
   anywhere, service layer included. Added `renameList()`/`archiveList()`, a new
   `app/api/lists/[id]/route.ts`, and a rename/delete header
   (`components/lists/list-header.tsx`) — same soft-delete-via-existing-`archived`-flag fix
   as pets, same reasoning (ADR-081). Lists didn't get a restore UI in this pass (pets did) —
   would need one, symmetrically, if that's ever wanted.
4. **Quick-add command palette — done.** Global Cmd/Ctrl+K palette
   (`components/command-palette/command-palette.tsx`, mounted in the dashboard shell) plus a
   mouse-accessible "Quick add ⌘K" trigger in the desktop sidebar. Scoped to two actions: jump
   to any nav destination, or type a title and quick-add a task from anywhere without
   navigating first. Hand-rolled (no `cmdk`/Radix dependency added — nothing of that kind
   existed in the codebase yet) and deliberately not natural-language/AI-driven — the agent's
   write tools don't exist yet (Milestone 8). See DECISIONS.md ADR-083.
5. **Calendar month/week grid views — done.** `/calendar` now has Month/Week/Agenda tabs
   (`components/calendar/calendar-view.tsx`) with prev/next/Today navigation for Month and
   Week. Month is a standard 7-column day grid with overflow-compressed event chips; Week is
   7 day columns each listing that day's events in full (deliberately not an hourly
   time-grid — this app's events don't need minute-level positioning). Agenda is unchanged.
   See DECISIONS.md ADR-086.
6. **Ambient weather backdrop — done.** A quiet, static (non-looping) mood-setting backdrop
   behind the Today greeting header — a hazy cloud wash, a rain-streak texture, or nothing at
   all for clear skies/no weather connection, derived from `lib/weather/ambient.ts`'s pure
   `conditions → mood` mapping. Deliberately static rather than an animated weather scene, to
   stay inside the Motion Principles doctrine (ADR-074) which rules out continuous background
   animation. See DECISIONS.md ADR-084. **(Update, 2026-08-19: rain and snow now animate —
   falling streaks/flakes, reduced-motion-aware — a scoped, user-requested exception to
   ADR-074; clouds mood stays static. Snow also became its own mood, previously folded into
   clouds. Same pass added a time-of-day gradient to the whole dashboard shell and made `Card`
   semi-transparent so it shows through. See DECISIONS.md ADR-104/ADR-105.)**
7. **Customizable mobile bottom nav — done.** Today is now a fixed, visually-elevated center
   tab (`components/layout/today-nav-link.tsx`) in a 5-column grid nav
   (`components/layout/mobile-nav.tsx`); the 4 surrounding positions are user-configurable
   from a new "Mobile navigation" section in `/settings`
   (`components/settings/bottom-nav-form.tsx`), stored in `users.bottom_nav_items`. Settings
   moved out of the bottom nav into a new mobile-only top header
   (`components/layout/mobile-header.tsx`), freeing all 4 slots for content pages. See
   DECISIONS.md ADR-085.
8. **Health page + activity timer — done.** `/health` was a `<ComingSoon>` placeholder since
   Milestone 0 despite `measurements` existing that whole time — now shows the latest
   measurement plus a real activity log. New `activity_sessions` table
   (`lib/db/schema/activities.ts`) backs a resumable stretch-session timer: tap "Activity" in
   the customizable bottom nav (or "Start stretching" on `/health`, for desktop) to start or
   resume a session, land in a full-screen ambient stopwatch
   (`app/ambient/activity/[id]/page.tsx`), Done logs it to Health, Cancel discards it. See
   DECISIONS.md ADR-087.
9. **Background job runner — done.** New `worker` Docker Compose service
   (`scripts/worker.ts`, `lib/jobs/registry.ts`) proactively refreshes weather, calendar,
   sports, and feed on each domain's existing TTL (15-30 min) instead of waiting for a page
   load to trigger a sync. Reuses the exact same provider-fetch-and-upsert functions the lazy
   path already had — the lazy path is unchanged and still there as a fallback if the worker
   is down. Removes the blocker Milestone 3 flagged for weather's rainfall-history/garden-zone
   logic (spec §13/§39) — snapshots now accumulate on a schedule, though that feature itself
   still isn't built. See DECISIONS.md ADR-088.
10. **PWA finalization — done.** `app/manifest.ts` gained `id`, `categories`, and `shortcuts`
    (Today, Start stretching, Ask LifeOS). A new self-suppressing "Install" button
    (`components/pwa/install-button.tsx`, shown in a new Settings card) appears only when the
    browser actually fires `beforeinstallprompt` — no separate installability check needed.
    Offline-first stays a deliberate non-goal (ADR-077's reasoning didn't change); `sw.js` is
    untouched. See DECISIONS.md ADR-089.
11. **Color restraint pass 2 — done.** Direct feedback on a live screenshot flagged three
    independent full-saturation blues (nav logo tile, active-tab filled circle, pulse dot)
    plus inconsistent icon stroke weights. Consolidated to one desaturated accent token
    (`app/globals.css`'s `--accent`/`--accent-dark`), dropped the Today tab's filled circle
    for a size/weight/color shift instead, made the logo monochrome/outline, and unified icon
    `strokeWidth` to `1.75` across nav + `DomainAvatar` + the weather card. The Life Pulse
    dot is now the only remaining solid accent fill in the app. See DECISIONS.md ADR-090.

## Feature roadmap doc (2026-08-14 planning session)

A written planning doc with explicit design principles ("calm over comprehensive," "decay-
based visibility," "reuse existing patterns," "don't duplicate other systems' data," "new nav
items are expensive") scoped 7 items plus an unprioritized backlog. Status:

1. **Categorized Tasks — done.** Fixed 5-category set, filter chips matching the Now/Today/
   Everything segmented style, quiet grouped view. See DECISIONS.md ADR-093.
2. **Cannabis Grow Tracking — done**, minus `photo_log`. New `"grow"` domain wired directly
   into the ranking engine (not a bespoke card) per the doc's explicit "model on Routines"
   instruction. `photo_log` (Immich asset references) deferred until item 6 exists. See
   DECISIONS.md ADR-094.
3. **Home Server Status (kilroys)** — not started. Blocked: needs the polling endpoint URL
   once it exists on kilroys (Docker Compose/`docker ps` + disk usage exposed over Tailscale).
4. **Golf (Spooky Golf)** — not started. Blocked: needs Spooky Golf's Postgres connection
   details or a read-only API endpoint over Tailscale.
5. **Workout Logging — done**, minus the actual auto-log trigger (that part's inherently
   external — Geoff's own home-network setup). `workouts` table, two-tap manual quick-log on
   `/health`, and `POST /api/workouts` accepting either a session cookie or a
   `WORKOUT_WEBHOOK_TOKEN` bearer token — ready for whichever of Home Assistant/Shortcut/NFC
   gets wired up later. Challenges' 75 Hard preset auto-checks its two workout habits from
   logged workouts instead of manual toggling, verified live. See DECISIONS.md ADR-095.
   **(Update, 2026-08-22: "instead of" was a real bug, not just a phrasing choice — a
   forgotten workout log made the habit permanently uncheckable for that day. Manual toggling
   is now always available alongside auto-check; workouts also gained an optional `time` field
   and a "Log a past workout" form for backfilling with a custom date/time/duration. See
   DECISIONS.md ADR-106.)**
6. **Feed / Log ("Moments") — built, pending a live Immich connection.** New `log_entries`
   table (reference-only, no photo storage) plus a Settings → "Immich (Moments)" connection
   form matching the Weather/Calendar encrypted-credential pattern. Chronological scroll (per
   Geoff's answer to the doc's own open question), placed as a "RSS | Log" segment inside the
   existing Feed tab — no new nav item. `POST /api/moments` accepts a session or a
   `MOMENTS_WEBHOOK_TOKEN` bearer token, same dual-auth shape as Workouts (ADR-095), ready for
   an eventual iOS Shortcut; an in-app manual-fallback form covers capture until then. Geoff
   supplied a live Immich API key directly in chat — per this environment's standing
   credential-handling rule, it was not entered anywhere by the agent; Geoff needs to paste it
   into the Settings form himself to actually connect. The upload → album-link → thumbnail
   round trip couldn't be verified live without that connection — everything up to the Immich
   call itself was (build/lint/test pass, full auth chain confirmed via a live 409 at exactly
   the right point). See DECISIONS.md ADR-096.
7. **Now/Today Tuning** — ongoing/iterative per the doc's own "do last" note, not a
   standalone pass. Calm-visibility improvements get folded in as each feature above touches
   the ranking engine (e.g. grow checks reusing routines' exact scoring/rendering rather than
   inventing a new visibility rule).

Backlog (kid milestones, kitchen/ferments, gear reference, trips, now-playing, admin/
subscriptions) — intentionally not scoped yet, tracked in the source doc, not duplicated here.

**Follow-up from real usage (2026-08-17):** two requests that came out of actually using items
2 and 6 on a phone, not from the original doc. (a) The mobile header now shows a back button +
parent-list label on detail routes (`/grow/[id]`, `/pets/[id]`, `/challenges/[id]`,
`/lists/[id]`) instead of always showing the LifeOS brand — a real tap target back to the list
after e.g. checking in on a Grow plant, not just swipe-back. (b) Grow plants can now have their
own per-plant Immich album (separate from the global Moments album), with photo upload/
chronological display on the plant detail page mirroring Moments' presentation. See
DECISIONS.md ADR-097.

**Sports overhaul + Today header links (2026-08-17):** two more follow-up requests. (a) Every
Today card header with a real destination page (Calendar/Tasks/Routines/Pets/Money/Sports/
Grow/Health/Lists) is now a tap target to that page, not just its individual item rows. (b)
Sports rebuilt entirely on sports-betting (a separate self-hosted app,
`/home/spooky/sports-betting`) instead of ESPN — live scores, status, and FanDuel odds via a
new `GET /api/lifeos/games` endpoint built there, gated on a shared token. The Sports page is
now every MLB/NFL game today as a card, sport-grouped (baseball, then football), with
favorited teams' games elevated above a divider; Today's own sports candidates stay
favorites-only, deliberately different scope from the browse page. `favorite_teams` moved from
ESPN team ids to plain abbreviations; the 7 existing favorites were cleared (no possible
mapping) with Geoff's explicit confirmation first. **Still needs Geoff's own follow-through**:
restart both `sports-betting` and LifeOS's `web` container with a matching
`LIFEOS_API_TOKEN`/`SPORTS_BETTING_TOKEN` for games to actually start showing — deliberately
left as his step rather than restarting his live betting app without being asked to.
Follow-up fix same day: the Sports page used to show the identical "No MLB or NFL games today"
text whether or not the integration was even connected, which read as a false factual claim
once Geoff hit it for real — now distinguishes "not connected yet" from "checked, genuinely no
games." See DECISIONS.md ADR-099.

**Swipe-to-complete on NOW (2026-08-17):** swipe a NOW card right to complete it in place —
tasks, routines (the literal "Cat Litter" example from the request), pet events, and Grow
check-ins, via the same complete action each already has elsewhere, not a new one. Financial/
calendar/sports rows stay plain links, on purpose — no one-tap "complete" makes sense for any
of them yet. Caught and fixed a real same-tick stale-state bug in the drag logic during live
verification (state read inside the release handler could be one render behind the actual
drag position). See DECISIONS.md ADR-100.

**Live favorite-team games surface to NOW (2026-08-22):** a direct follow-up to the ADR-036/
ADR-099 "sports stays TODAY-tier, even on game day" design — a scoped exception for a game
that's actually `"Live"` right now (not just scheduled). `lib/today/service.ts` stops
filtering Live-status games out of Today's candidate pipeline; `lib/today/ranking.ts` gives a
live game importance 70 instead of the standard 6, guaranteeing it crosses `NOW_THRESHOLD`;
`DueBadge` shows a plain "LIVE" badge instead of misleading date math once kickoff has passed,
and the subtitle upgrades to a live score line. Not verified against real sports-betting data
(no favorite teams/live games available in this environment) — verified via a new ranking unit
test plus a synthetic markup injection matching the real component output. See DECISIONS.md
ADR-107.

## Suggested next increment

Milestone 8 (AI Actions) would be the natural next step architecturally (the read-only
agent from Milestone 7 is verified and working, and write tools are additive — new tools in
the same registry, same audit log, not a rework) — but is deliberately **not** the pick right
now given local inference is slow on this machine's hardware (`llama3.2:3b` is 20-60s/turn on
CPU; GPU was investigated and ruled out, see DECISIONS.md — the iGPU's chip revision isn't
supported by ROCm even with override flags, it segfaults on actual inference). Non-AI options,
roughly smallest to largest:

- ~~**Notes.**~~ — **done (2026-08-19).** `/notes` was a bare `<ComingSoon>` with no milestone
  ever assigned; now a full manual CRUD (`notes` table: `title`/`body`/`pinned`/`archived`) at
  `/notes` (grid) and `/notes/[id]` (autosaving editor), matching the Lists module's soft-delete
  pattern. No AI summarization, no Today ranking integration — same reasoning as Feed/RSS
  staying off Today. See DATA_MODEL.md `notes.ts`.
- ~~**A real notifications system.**~~ — **done (2026-08-19).** `notifications` +
  `push_subscriptions` tables, Web Push (VAPID, `lib/notifications/push.ts`, `public/sw.js`
  `push`/`notificationclick` handlers), a Settings toggle to enable/disable per device
  (`components/settings/notifications-form.tsx`), and a bell with an in-app notification list
  (`NotificationBell`, mounted in both the desktop sidebar and mobile header). Categorized per
  docs/CALM_COMPUTING_DECISIONS.md's Notification Philosophy
  (immediate/time_sensitive/digest/silent) — only the first two actually push. Populated by a
  new `notifications` job in the background worker (`lib/jobs/registry.ts`, every 10 min):
  re-derives each user's NOW tier from the existing ranking pipeline and creates one
  notification per NOW item not already notified in the last 24h, so a persistently-overdue
  item doesn't re-alert on every run. Caught and fixed a real bug during live verification —
  a raw `sql` template with a `Date` param wasn't serializing correctly through the
  postgres.js driver (`hasRecentNotification`'s dedupe query); switched to drizzle's `gte()`
  operator instead. Verified live: ran the worker locally, confirmed 3 real overdue NOW items
  (a routine, a pet medication, a task) generated notifications, the bell showed the correct
  unread count, mark-read and mark-all-read both worked, and clicking a notification navigated
  to the right page. **Not verified**: actual push delivery to a real device — this
  environment's dev service worker registration is intentionally skipped
  (`register-service-worker.tsx`), same class of gap as ADR-089's install button; the Settings
  toggle correctly shows "not available"/"blocked" states instead of crashing. See
  DATA_MODEL.md `notifications.ts`.
- **Milestone 17 — Media Sources (Navidrome/Jellyfin).** Not started. Same shape as the
  weather/calendar/sports integrations already built (one-off provider module +
  `CandidateInput` in the ranking pipeline) — a good next domain if another "connect a
  self-hosted service" build is wanted.
- **Milestone 16 — Family / multi-user households.** Not started (DECISIONS.md ADR-013-ish
  scoping). Bigger and more structural — every service function today is written
  single-user-scoped-by-`userId`; this would touch auth, sharing/permissions, and likely the
  ranking pipeline's assumptions, not just add a new page.

**Also queued (2026-08-19, direct request, outside this list's original ordering): a weather
revamp.** Current weather (Milestone 3) only surfaces a same-day snapshot on Today — no hourly
breakdown, no multi-day outlook, forcing the user off-app for real weather detail. Plan: a
dedicated `/weather` page with current conditions, an hourly schedule, and a 7-day outlook,
likely requires moving off OpenWeatherMap's current+same-day-forecast call to a richer endpoint
and storing more granular forecast data than `weather_snapshots` currently keeps.

~~Background job runner~~ — done (item 9 above, ADR-088). It unblocks a real notifications
system (see above) and weather's rainfall-history/garden-zone logic (Milestone 3), but doesn't
build either of those itself.

A dedicated/newer GPU or a cloud provider would still make Milestone 8 practical sooner —
revisit if either becomes available.

## Architecture: Signal/Source pipeline is deferred (decided 2026-08-11)

DECISIONS.md ADR-014 through ADR-029 describe a considerably larger architecture than what's
implemented: a formal Source (connect/disconnect/sync/health_check/normalize) and Signal
abstraction, a FEED layer (RSS, systems monitoring, external interest content), and a
Sources → Signals → priority/suppression → NOW/TODAY/FEED pipeline.

Decision: keep extending the current pattern (`CandidateInput` in `lib/today/ranking.ts`,
one-off modules like `lib/weather/` and `lib/calendar/`) domain-by-domain rather than
pausing to build the formal Signal/Source pipeline now. Five domains now exist on this
pattern (tasks, routines, pets, financial, calendar) — worth revisiting whether that's
enough real cases to validate the Signal/Source abstraction against, next time this comes up.
See DECISIONS.md ADR-030.
