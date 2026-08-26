# Decisions

Numbered architecture decision log for LifeOS. ADR-001 through ADR-010 restate the decisions
from the original [product spec](docs/LIFEOS_PRODUCT_ENGINEERING_SPEC.md#70-key-architectural-decisions);
ADR-011 through ADR-038 were decided during implementation; ADR-039 through ADR-072 are the
2026-08-12 calm-computing/adaptive-UI direction, condensed from
[docs/CALM_COMPUTING_DECISIONS.md](docs/CALM_COMPUTING_DECISIONS.md); ADR-073 on is
implementation work done in response to that direction (ADR-073: color restraint, ADR-074:
motion, ADR-075: Feed digest, ADR-076: Life Pulse v1, ADR-077: PWA/Milestone 10, ADR-078:
Ollama timeout, ADR-079: attention-budget overflow v1, ADR-080: Ambient Display v1, ADR-081:
pets/lists soft-delete fix, ADR-082: pet birthdays + retire/restore, ADR-083: quick-add
command palette, ADR-084: ambient weather backdrop, ADR-085: customizable mobile bottom nav,
ADR-086: Calendar month/week views, ADR-087: activity sessions + ambient stretch timer,
ADR-088: background job runner, ADR-089: PWA finalization, ADR-090: color restraint pass 2,
ADR-091: Challenges domain, ADR-092: weight tracking chart, ADR-093: fixed task categories,
ADR-094: grow tracking, ADR-095: workout logging, ADR-096: Moments/Immich photo log, ADR-097:
mobile back nav + per-plant Immich photo log, ADR-098: due-date timezone bug fix, ADR-099:
Today header links + Sports rebuilt on sports-betting, ADR-100: swipe-to-complete on NOW,
ADR-101: surface account/reminder dates, not just urgency badges, ADR-102: same fix extended
to every Today TODAY-tier group card, ADR-103: calendar/sports TODAY dates need the actual
date, not just weekday). This file is the canonical ADR ledger —
[ARCHITECTURE.md](ARCHITECTURE.md) describes structure, not rationale.

### ADR-001: Modular monolith

**Decision:** One deployable Next.js app; domain code organized by folder (`lib/<domain>/`),
not by service.
**Reason:** Nothing about the current scope justifies the operational cost of microservices.
Split out a service only when there's a concrete reason (e.g. the agent runtime growing large
enough to warrant isolation).

### ADR-002: PostgreSQL is the primary data store

**Decision:** PostgreSQL via Drizzle ORM, with the `pgvector` extension available from day one
(`pgvector/pgvector:pg16` image) for semantic memory later.
**Reason:** Drizzle over Prisma for a thinner runtime (no codegen step blocking type
availability) and because raw SQL / `pgvector` queries are more natural with a query builder
than an ORM abstraction layer.

### ADR-003: The application database owns long-term memory

**Decision:** Personal facts, history, routines, and events live in normal tables
(`activity_events` is the cross-domain timeline). The LLM is never the store of record.
**Reason:** If the model changes, the user's LifeOS should still remember everything.

### ADR-004: LLM providers are interchangeable

**Decision:** No domain code couples directly to a vendor SDK. A future `ModelProvider`
abstraction will call into existing `lib/<domain>/service.ts` functions rather than touching
Drizzle directly.
**Reason:** The underlying LLM is a replaceable dependency, not the application's database.

### ADR-005: AI interacts with the application only through permissioned tools

**Decision:** When the agent is built (Milestone 7), it gets tool functions, not raw database
access. Those tools are the same service functions the `/api/*` route handlers already call.
**Reason:** Validation, permissions, and audit logs all require a tool boundary; unrestricted
DB access removes that boundary.

### ADR-006: Manual workflows before integrations

**Decision:** Weather, sports, Google Calendar, and bank integrations are deferred. Tasks,
routines, lists, pets, and financial reminders are fully manual-entry and already usable.
**Reason:** The product should be useful immediately, not gated on OAuth flows and third-party
API keys.

### ADR-007: Today is the primary UX

**Decision:** `/` is not a generic dashboard — it's a synthesized, ranked view. See ADR-011.
**Reason:** The product should answer "what should I know or do right now," not just mirror
the database.

### ADR-008: The product remains usable when AI is unavailable

**Decision:** No page currently depends on AI (`/ask` is a placeholder). When Milestone 7
lands, every other page must keep working if the model provider is unreachable.
**Reason:** AI is additive to LifeOS, not load-bearing infrastructure.

### ADR-009: Mobile web/PWA is a first-class future target

**Decision:** The dashboard shell already has a mobile bottom nav and safe-area padding.
Manifest/service worker/installability work is Milestone 10 and not started yet.
**Reason:** The primary deployment target is a home server reached mostly from a phone; the
UI has to be mobile-first from the start even before the PWA shell exists.

### ADR-010: External integrations normalize into LifeOS domain objects

**Decision:** Every domain table has a `source` column (`manual`, `agent`, a future provider
name, etc.).
**Reason:** Debugging and reconciliation need to know where a record came from, even before
any integration exists to populate that column with something other than `manual`.

### ADR-011: Mobile attention model

**Decision:** Mobile does not show fixed cards for every domain. Instead, candidate items are
ranked and suppressed based on urgency, importance, actionability, exception, context, and
user preference. The default mobile hierarchy is: **NOW → TODAY → EVERYTHING**.
**Reason:** The value of LifeOS is information compression, not maximum information density.

**Implementation note:** `lib/today/ranking.ts` implements the scoring/bucketing described in
[UX_PRIORITIZATION.md](UX_PRIORITIZATION.md); `lib/today/service.ts` supplies the raw
candidates. Context-awareness (location, time-of-day beyond due dates) and explicit
user-preference weighting are not implemented — there's no data source for either yet — so
today the ranking runs on urgency, importance/domain weight, and exception state only. This
is a v1, not the final algorithm; revisit once there's a preferences UI or contextual signals
to feed in. Desktop currently renders the same NOW/TODAY grouping as mobile rather than a
separate "organizing" layout — see ROADMAP.md if that diverges later.

### ADR-012: Session-backed auth, not JWT

**Decision:** Sessions are stored in a `sessions` table (hash of a random token in the DB,
opaque token in an httpOnly cookie) rather than a signed JWT.
**Reason:** A session needs to be revocable server-side (logout deletes the row) without
maintaining a JWT blocklist. Single-user today, but `user_id` is on every domain table from
the start (spec §7) so multi-user is additive, not a rewrite.

### ADR-013: First-run setup instead of open signup

**Decision:** `/login` shows an account-creation form only when the `users` table is empty,
and refuses to create a second account once one exists. There is no public registration
route.
**Reason:** This is a self-hosted, single-user app reachable on a home network; open signup
is a liability with no corresponding benefit.

### ADR-014: Mobile is an attention interface, not a full dashboard

**Decision:** The mobile/PWA home screen will not attempt to display every LifeOS domain at
once. Instead mobile prioritizes a small number of items that deserve attention now. Hierarchy:
`NOW` (immediate attention) → `TODAY` (relevant today) → `FEED` (interesting or newly available
information) → `EVERYTHING` (full LifeOS data and modules). Desktop/web may expose richer,
more persistent detail; mobile stays highly selective.
**Reason:** A phone screen is too constrained for a traditional "everything dashboard." The
value of LifeOS is not maximum information density — it's deciding what matters enough to
surface.

### ADR-015: Domains compete for attention, not permanent screen space

**Decision:** The mobile home screen has no fixed permanent card per domain. There is no
requirement that Pets, Finance, Sports, Weather, Home, Health, or Garden always appear; each
domain instead produces candidate items or signals that compete for placement based on
relevance (e.g. "no pet event today" → no card, "credit card due tomorrow" → surfaces in NOW,
"0.8&quot; rain expected" → garden surfaces "skip watering today", "routine sports news article"
→ FEED only).
**Reason:** Fixed dashboards eventually become cluttered and train the user to ignore them.
LifeOS should prioritize exceptions and actionable changes over continuously displaying stable
information.

### ADR-016: Distinguish information from attention

**Decision:** The system explicitly distinguishes passive information ("Temperature is 82°F",
"HVAC filter was changed 35 days ago", "Chase statement balance is $1,200") from information
requiring attention ("Thunderstorms expected during your outdoor event", "HVAC filter due in 3
days", "Chase payment due tomorrow"). Raw information may remain available in domain views;
only sufficiently relevant information is promoted into NOW or TODAY.
**Reason:** Conflating "here is a fact" with "you should act on this" is what makes dashboards
noisy.

### ADR-017: Prioritization is deterministic first

**Decision:** The core prioritization engine is implemented with explicit deterministic
application logic rather than delegated to an LLM. Candidate items are scored on factors such
as urgency, importance, actionability, exception state, current context, user preference,
recency, and acknowledgement state. The exact scoring system may evolve; the LLM may later
assist with grouping, summarization, ambiguity resolution, and recommendations, but not with
core ranking.
**Reason:** Important life events should not depend on opaque LLM judgment. Deterministic logic
gives predictability, testability, explainability, easier debugging, and user trust. See
ADR-011 for the current implementation.

### ADR-018: Suppression is a first-class feature

**Decision:** LifeOS explicitly models reasons *not* to surface an item: no action required,
nothing changed, too far in the future, recently shown, already acknowledged, repeatedly
dismissed by the user, superseded by a higher-level insight, or communicated more effectively
by another item. Use milestone-based escalation instead of repeating the same reminder daily
(e.g. "HVAC filter due in 14 days" mentioned once, surfaced prominently at 3 days, strongly at
the due date, then escalated gradually if overdue — not a duplicate reminder every single day).
**Reason:** Attention fatigue is one of the primary risks of LifeOS. The system must optimize
not only what is shown but also what is withheld.

### ADR-019: Related signals should be compressed into human thoughts

**Decision:** LifeOS should group related records into concise higher-level insights when
possible, e.g. "Rain today: 0.4&quot;, rain tomorrow: 0.3&quot;, water lawn/garden/flowers tasks"
compresses to "Skip outdoor watering today — about 0.7&quot; of rain is expected through
tomorrow." Similarly "Guests coming Saturday + 3 house tasks + 1 shopping item" compresses to
"Guests Saturday — 3 house tasks and 1 shopping item to handle beforehand."
**Reason:** LifeOS should reduce cognitive load, not merely aggregate records. The LLM may help
generate these summaries, but the underlying facts and eligibility rules stay structured and
deterministic (ADR-017).

### ADR-020: LifeOS will add a Feed layer

**Decision:** LifeOS includes a distinct FEED layer, separate from NOW and TODAY, for external
information that is interesting but does not normally deserve interruption-level attention
(Reddit, RSS, sports news, technology news, GitHub activity, Docker events, home server status,
release feeds, local news, other subscribed sources).
**Reason:** Personal obligations and external information have different attention value — a
Reddit post should not compete directly with "vet appointment in 30 minutes." The Feed lets
LifeOS include the user's broader world without turning the primary attention interface into a
noisy social stream.

### ADR-021: No traditional infinite social feed

**Decision:** The Feed emphasizes compression and catch-up ("what's new since I last looked?",
"since this morning: 3 notable sports updates, 2 highly relevant Reddit posts, 14/15 homelab
services healthy") rather than endless scrolling. Users may drill into underlying items when
desired.
**Reason:** LifeOS exists to reduce information overload; replicating an infinite engagement
feed would conflict with the core product philosophy.

### ADR-022: External integrations are modeled as Sources

**Decision:** External integrations are represented through a common Source abstraction,
grouped by category — PERSONAL (Apple Calendar, Google Calendar, Apple Health), ENVIRONMENT
(Weather, Rainfall), INTERESTS (Reddit, RSS, Sports), SYSTEMS (Docker, Home Assistant,
Pi-hole, NAS, uptime monitoring), FINANCE (banking provider), DEVELOPMENT (GitHub, release
feeds). Each Source is responsible for retrieving and normalizing external data behind a
conceptual `connect / disconnect / sync / health_check / normalize` interface.
**Reason:** The Source abstraction prevents external-provider logic from leaking throughout
domain code and gives LifeOS a consistent way to ingest new information. Complements ADR-004's
model-provider abstraction and ADR-010's `source` column.

### ADR-023: Sources produce normalized Signals

**Decision:** External Sources and internal LifeOS domains may emit normalized Signals, e.g.
`calendar.event_upcoming`, `task.overdue`, `bill.payment_due`, `pet.medication_due`,
`weather.heavy_rain_expected`, `garden.watering_unnecessary`, `sports.game_starting`,
`docker.container_unhealthy`, `rss.new_item`, `reddit.new_item`. Conceptual Signal fields: `id,
user_id, source, domain, type, title, summary, occurred_at, relevant_until, severity,
importance, actionability, url, metadata, created_at`. Signals are evaluated by the
prioritization engine.
**Reason:** The Signal layer separates raw integrations from what the user should actually see,
and becomes a common language across LifeOS domains.

### ADR-024: Signals have attention privileges

**Decision:** Signal types have default eligibility for different attention layers — NOW
(calendar event soon, medication due, payment due, severe weather, critical service outage),
TODAY (normal chores, sports schedule, deliveries, garden recommendation, non-critical server
warning), FEED (Reddit, RSS, sports articles, GitHub releases, normal infrastructure status).
Users may customize these rules (e.g. "Plex down" → Feed only, but "Home Assistant down" →
NOW).
**Reason:** Not every Source should have equal ability to interrupt the user. Attention
privileges create a clear boundary between important operational signals and informational
content.

### ADR-025: RSS is a strategic generic integration layer

**Decision:** LifeOS supports RSS/Atom as an early generic Feed integration. RSS items
normalize into a common FeedItem/Signal format: `id, source_id, title, url, summary, image_url,
author, published_at, tags, read_at, saved_at, metadata`.
**Reason:** RSS provides broad integration coverage without requiring bespoke APIs for every
publication, blog, community, sports site, or release channel. Specialized integrations may
later replace RSS where richer structured data creates meaningful product value.

### ADR-026: Systems monitoring is part of the personal environment

**Decision:** Self-hosted infrastructure (Docker, Uptime Kuma, Home Assistant, NAS, Pi-hole,
server health, backups, storage usage) may be incorporated into LifeOS as a Systems domain. The
default experience summarizes system health ("Homelab: 14/15 services healthy. Immich
restarted twice in the last hour.") rather than recreating dedicated administration tools —
avoid rebuilding a full Portainer replacement, container administration UI, or deep monitoring
dashboards.
**Reason:** For a self-hosted user, the home server is part of the environment they manage.
LifeOS should surface meaningful exceptions without becoming an infrastructure-management
product.

### ADR-027: A Source must earn its place in LifeOS

**Decision:** New integrations should generally be added only when they satisfy at least one
of: (1) LifeOS can help the user act on the information, (2) LifeOS can significantly reduce
the attention required to consume it, or (3) the Source contributes useful context to another
LifeOS decision. E.g. Docker → "everything healthy" or surface an exception (good), not rebuild
Portainer (bad); Reddit → summarize the 3 relevant posts out of 50 (good), not clone the Reddit
home feed (bad); Weather → "skip watering" (good), not dump every weather metric onto Today
(bad).
**Reason:** Without this constraint, LifeOS could become an endless portal project with
hundreds of integrations but little coherent product value.

### ADR-028: The Feed is available to the AI agent

**Decision:** The AI agent may query Feed and Source information through permissioned read
tools (e.g. "anything interesting going on?", "what's happening with the Cubs?", "anything
broken on my server?", "catch me up since yesterday"). The agent may synthesize across personal
life, systems, interests, and external feeds, but must preserve the distinction between
confirmed personal facts, external information, and inferred conclusions.
**Reason:** Consistent with ADR-005 — the agent gets permissioned tools, not raw access — and
extends that boundary to Feed/Source data, not just domain data.

### ADR-029: The Signal/Priority layer is a central architecture boundary

**Decision:** LifeOS conceptually follows this pipeline: Sources (Apple, Calendar, Weather,
Sports, Reddit, RSS, Docker, Home Assistant, Finance, internal tasks, Pets, etc.) → raw/domain
data → Signals → priority + suppression → `NOW` / `TODAY` / `FEED` → LifeOS UI. The AI agent
operates across these layers through controlled tools (ADR-028).
**Reason:** This architecture separates data ingestion from attention management, and lets
LifeOS support many domains without forcing the UI to mirror the shape of every underlying
integration.

### ADR-030: Weather is the first real integration, built ahead of the Signal/Source pipeline

**Decision:** Weather (OpenWeatherMap) was implemented as a conventional `lib/weather/`
module — a `WeatherProvider` interface, a service layer with its own caching, and a
`CandidateInput`-shaped entry into `lib/today/ranking.ts` — not as a formal Source emitting
Signals per ADR-022/023. The API key is encrypted at rest with AES-256-GCM
(`lib/security/crypto.ts`, key from the `APP_ENCRYPTION_KEY` env var) and never returned to
the client once saved.
**Reason:** ADR-014 through ADR-029 were written after weather was mostly built. Redoing it
as a formal Signal/Source on the spot would have blocked shipping a working feature on an
architecture decision that hadn't been made yet. This is deliberate near-term debt, not an
oversight — see ROADMAP.md's "Open architectural question" for the actual decision to make
before the next integration.

### ADR-031: Migrations run as their own Compose service, not baked into `web`'s startup

**Decision:** `docker-compose.yml` has a `migrate` service (Dockerfile's `migrator` stage —
full `node_modules` including `tsx`/`drizzle-orm`, since Next's standalone runner output
prunes devDependencies and can't run migrations itself). It runs `npm run db:migrate` once
and exits; `web` has `depends_on: migrate: condition: service_completed_successfully`, so it
won't start until migrations succeed. Safe to run on every `up` — applied migrations are
tracked and skipped.
**Reason:** Found via a real deployment failure: a fresh `pgdata` volume has no tables, and
without this, `web`'s first query (`select count(*) from "users"`, in the first-run-setup
check) throws `relation "users" does not exist` forever, since nothing ever ran the
migration. Verified the fix against an actual fresh volume, not just a fresh `web` container.

### ADR-032: Session cookie `Secure` flag derives from `APP_URL`, not `NODE_ENV`

**Decision:** `lib/auth/session.ts` sets the cookie's `secure` option from
`APP_URL.startsWith("https://")`, not `process.env.NODE_ENV === "production"`.
**Reason:** Found via a real deployment failure: Docker sets `NODE_ENV=production`
regardless of whether the deployment is actually behind HTTPS. A self-hosted instance
reached over plain HTTP (no reverse proxy/TLS yet — the common first-deploy state) got a
`Secure` cookie that browsers silently refuse to persist, so every navigation after login
looked unauthenticated ("makes me log in for most pages"). `APP_URL`'s scheme is the actual
signal for how the app is reached, and the deploy story already requires setting it
correctly (see `.env.example`). Verified via a real Docker build (`NODE_ENV=production`) —
`npm run dev` never exercises this bug since dev's `NODE_ENV` is never `"production"`.

### ADR-033: Calendar sync uses iCloud CalDAV, not Google Calendar OAuth

**Decision:** Milestone 5 connects to iCloud via CalDAV (`tsdav` + `ical.js`, HTTP Basic auth
with an app-specific Apple ID password) rather than the Google Calendar OAuth flow the
original spec's Milestone 5 described.
**Reason:** User-directed — asked specifically for "iOS calendar." iCloud CalDAV pulls the
calendars actually synced to an iPhone by default, with no native app required; Google
Calendar OAuth only sees calendars connected to a Google account, which may not overlap with
what's on-device. A deeper EventKit-based native companion app (spec §36) would see
everything regardless of source, but that's a much larger, explicitly-deferred undertaking.
`calendar_accounts.provider` stays a plain column so Google OAuth can be added later without
a schema change, even though the credential shape differs (encrypted app-specific password
vs. OAuth access/refresh tokens).

### ADR-034: Integrations degrade gracefully on credential failure, not just on absence

**Decision:** When a connected integration's stored credential stops working (e.g. a
revoked iCloud app-specific password), the app shows an inline error where that data would
appear and keeps serving the last-synced data, rather than throwing a page-level error.
`lib/calendar` sets the precedent: `GET /api/calendar/events` catches
`CalendarProviderError` and returns it as data (502 + message) instead of letting it
propagate; `AgendaList` renders that as a banner alongside whatever's already cached.
**Reason:** Extends ADR-008 ("usable without AI") to integrations generally — a stale
password or an upstream outage in one Source shouldn't take down a page that has other,
unrelated content to show.

### ADR-035: Agent tools return lean, hand-picked shapes — never raw DB rows

**Decision:** Every tool handler in `lib/agent/tools.ts` maps service-layer results down to
just the fields relevant to answering questions (e.g. `get_pets` returns `{name, species,
breed, upcomingEvents}`, not the full `pets` row with `id`/`userId`/`createdAt`/etc., and
`upcomingEvents` itself is trimmed the same way).
**Reason:** Found via a real failure, not just applying spec §22 ("don't send the entire
database to the LLM") as a principle: with raw rows, a tool call would execute successfully
and get logged, but the model's *next* response — the one meant to synthesize an answer from
the tool result — came back completely empty. Reproduced directly against Ollama: a
hand-crafted minimal tool result synthesized correctly every time; the actual raw-row
payload (nested objects, internal ids, audit timestamps, unrelated columns) did not,
consistently. `llama3.2:3b` (the default local model, chosen for being pullable/runnable
without a GPU) has limited context handling, and the extra noise was enough to break it.
Trimming tool output fixed it and is very likely to matter for any small/local model, not
just this one — keep new tools lean by default rather than "raw row, optimize later."

### ADR-036: Sports uses ESPN's public site API; games are TODAY-tier, never NOW-tier

**Decision:** `lib/sports/provider.ts` calls ESPN's undocumented public site API
(`site.api.espn.com`, no key required) rather than a paid sports-data API — team search and
schedule-by-team are enough for the "follow a team, see its games" scope, and no key
management is needed. `sports_events` is a shared cache keyed on `(provider, external_id)`,
not per-user, since the same game is the same row regardless of who's following which team.
Matching a user's favorite teams to cached events uses composite `(league,
team_external_id)`, not `team_external_id` alone, because ESPN reuses small integer IDs
across different sport+league namespaces (discovered while implementing, not assumed).
Separately: in `lib/today/ranking.ts`, `sports` importance is deliberately low (score 6,
same tier as routine due-soon) so a favorite team's game — even one happening today — stays
in the TODAY tier and never crosses into NOW. NOW is reserved for things the user has to
*act* on (an overdue task, a bill due, an appointment); a game the user might want to watch
is "nice to know," not an obligation, even though its `dueAt` (kickoff time) can be as
time-sensitive as an appointment's.
**Reason:** Matches ADR-011's NOW/TODAY split by information *type*, not just time-until-due
— urgency alone would otherwise put same-day games in NOW right alongside things that
actually require action.

### ADR-037: AMD Vega Mobile iGPU (gfx902) is not a viable Ollama accelerator on this host

**Decision:** Investigated running Ollama's inference on this host's integrated GPU (AMD
Vega Mobile, gfx902) via ROCm inside a separate test container, at the user's request
("worth testing"). Confirmed the chip is not supported: `HSA_OVERRIDE_GFX_VERSION=9.0.0`
(gfx900) was rejected outright by ROCm; `9.0.8` (gfx908, "Vega 8 Graphics") was accepted and
recognized as inference-capable compute (6.8GB VRAM reported) once `OLLAMA_IGPU_ENABLE=1`
was also set, but the model **segfaulted** the moment an actual prompt was run — confirmed
via `docker logs` on the ROCm container. Overriding the reported chip ID gets ROCm to
*attempt* dispatch, but the real hardware doesn't have the instructions the overridden
target expects, so it crashes rather than runs — this is a genuine hardware/driver
limitation, not a config problem. Cleaned up the test container/volume and left the working
CPU-only `lifeos-ollama-1` container as the only configuration.
**Reason:** Recording so this isn't re-attempted the same way later. CPU inference stays the
baseline for this host; a real path to faster inference is a newer/dedicated GPU or an
OpenAI-compatible cloud provider behind the existing `ModelProvider` interface (see
ROADMAP.md's Milestone 8 note), not further ROCm override tricks on this chip.

### ADR-038: Feed (RSS) is its own page, not a Today ranking domain

**Decision:** `lib/feed/` (provider via `rss-parser`, service, `/feed` page) follows the
same conventional-module pattern as weather/calendar/sports (ADR-030) rather than the formal
Signal/Source pipeline — consistent with ADR-030's "keep extending domain-by-domain"
decision. Unlike those other domains, Feed items are **not** added as `CandidateInput`s to
`lib/today/ranking.ts` at all — there's no `feed` case, and no Feed group appears on the
Today page. Instead `/feed` is a standalone page, reachable from the sidebar like Calendar
or Money.
**Reason:** ADR-020/ADR-024 already drew this line at the conceptual level — RSS/interest
content belongs in a distinct FEED attention tier, explicitly separate from NOW/TODAY,
specifically so a Reddit post or tech article never competes with an overdue task or a
vet appointment for the same screen space. Sports schedules got a TODAY-tier ranking entry
(ADR-036) because a favorite team's game is a personal, opt-in appointment-like event with a
specific `dueAt`; RSS items are the opposite case ADR-020 was written for — general-interest
content with no due date and no action attached. Giving Feed its own page rather than a
ranking entry is the simplest thing that satisfies the FEED-tier distinction without
building the full Signal/priority pipeline early.
**Also decided:** subscribing is by URL only (paste any RSS/Atom link), matching ADR-025 —
one generic parser instead of bespoke per-publisher integrations. The user chose to seed
three starter subscriptions (The Verge, BBC World News, Hacker News) rather than ship with
an empty Feed; all three were added through the real Settings UI, not a database seed
script, keeping with this project's "verify live" discipline for integrations.

## Calm Computing, Adaptive UI & Attention Design (ADR-039 through ADR-072)

The following were accepted as product direction on 2026-08-12, supplied as a single large
document — [docs/CALM_COMPUTING_DECISIONS.md](docs/CALM_COMPUTING_DECISIONS.md) is that
document kept verbatim, with full illustrated examples and ASCII mockups for each entry.
What follows is the condensed version, renumbered to continue this ledger (the source
document numbers its own entries ADR-027 through ADR-060, starting over — those numbers
collide with this file's existing ADR-027 through ADR-038, which are different decisions).
Where a new entry restates or sharpens something already decided, that's called out rather
than duplicated at length.

This batch is a **product-direction merge, not an implementation milestone**. Most entries
describe intended behavior; only a few are already true of the running app today, and several
describe substantial unbuilt surface area (Life Pulse, Ambient Mode, generative UI, family
multi-user, media Sources). See ROADMAP.md's "Calm computing: adopted direction vs. open
work" section for what's already consistent, what's a near-term conflict worth fixing, and
what's genuinely future scope.

### ADR-039: Calm is the default, successful state

**Decision:** The absence of surfaced information is a successful application state, not an
empty one to be filled. LifeOS must not add content to a screen just because space is
available.
**Reason:** Sharpens ADR-015/ADR-018 into an explicit product stance: a Today page showing
only a greeting, the date, and current weather — nothing else — is a *working* outcome when
nothing needs attention, not an incomplete dashboard. Already broadly true of the current
Today page (domain groups only render when they have items, per ADR-015); the "Nothing needs
you" framing itself isn't implemented as an explicit calm state yet.

### ADR-040: The calm-computing attention ladder

**Decision:** Information moves through named stages before it earns center-of-interface
placement: `KNOWN → AMBIENT → RELEVANT → ACTIONABLE → URGENT`. Most information should sit in
the first two stages; only a small percentage should ever reach the center.
**Reason:** Gives ADR-018's "milestone-based escalation" (mentioned there only via an HVAC
filter example) a named, general ladder to design new suppression/escalation logic against —
e.g. a bill 20 days out is `KNOWN` (unsurfaced), 7 days out is `AMBIENT` (visible in Money),
3 days out is `RELEVANT` (may enter TODAY), due tomorrow is `ACTIONABLE` (prominent), overdue
is `URGENT` (escalates). `lib/tasks/status.ts`'s `DueStatus` (`overdue` / `due_soon` /
`upcoming` / `none`) is a coarser three-stage version of this same idea already implemented.

### ADR-041: Attention may be represented spatially

**Decision:** Position, scale, contrast, and motion may communicate relevance — items become
more visually prominent as they become more relevant, without requiring literal orbital
graphics.
**Reason:** A guiding visual principle for future redesign work, not a specific component.
No implementation change implied today — current NOW/TODAY placement (ADR-011) already
encodes relevance as *which section* an item is in; this extends the idea to continuous
visual treatment within a section.

### ADR-042: Life Pulse — a persistent global attention-state object (exploratory)

**Decision:** Explore a persistent visual object ("Life Pulse") representing overall
attention state — `CALM` / `ACTIVE` / `ATTENTION` / `URGENT` — distinct from a
notification-badge unread count (see ADR-043). Tapping it may reveal the reasons behind the
current state.
**Reason:** Marked "explore" deliberately — this is a concrete, unbuilt UI concept, not yet
a commitment to a specific implementation. Not started; see ROADMAP.md.

### ADR-043: No unread counts as the primary attention mechanic

**Decision:** Avoid raw counters ("Tasks 17", "Feed 42") as the default way to communicate
that something needs attention. Prefer semantic summaries: "Everything is quiet.", "2 things
need attention.", "Nothing notable since this morning."
**Reason:** Counts create obligation without communicating importance. **Known current
conflict:** `components/dashboard/at-a-glance.tsx` / `buildGlanceStats()` in
`lib/today/service.ts` render raw counts ("2 tasks pending", "14 games this week") — this
predates the current ADR and hasn't been revisited against it yet. Flagged in ROADMAP.md as
a candidate near-term fix, not changed as part of this doc merge.

### ADR-044: Completion should restore calm, not backfill the freed space

**Decision:** Resolving an attention item must not automatically pull in the next-lowest
item just because screen space opened up. The interface should settle toward "nothing needs
you," not toward "here are seven more things."
**Reason:** LifeOS is not an infinite productivity queue (extends ADR-021's "no infinite
feed" stance to task completion specifically). The current implementation is already
compatible in spirit — completing a task just triggers `router.refresh()`, which recomputes
ranking from what's still actually due, not from a backlog queue — but there's no explicit
"all done" / settled-state treatment yet when a group empties out.

### ADR-045: The UI adapts to the rhythm of the day

**Decision:** Presentation may shift what it emphasizes by time of day — morning favors
schedule/weather/departures, afternoon favors the next event and remaining tasks, evening
favors remaining obligations and wind-down, late evening favors a minimal "tomorrow preview."
This is about emphasis, not decorative theming.
**Reason:** Time-of-day is listed as a currently-unused context signal in ADR-011's
implementation note ("context-awareness... not implemented — there's no data source for
either yet"). This ADR gives that eventual signal a concrete design target. Not implemented.

### ADR-046: Aggressive progressive disclosure

**Decision:** An item's first presentation should contain only enough detail to understand
its significance (e.g. "Milo · Vet · 2:30 PM · Leave in 42 min"); full detail (vet name,
address, visit history) lives behind a tap, not in the summary view.
**Reason:** The repository may hold far more than the summary needs (see ADR-070). Partially
already true — Today cards already show title + subtitle + due badge only, deferring to
domain detail pages for the rest — but this hasn't been treated as an explicit, deliberate
pattern to defend when adding new UI.

### ADR-047: The application itself can become the AI's response

**Decision:** Not every Ask LifeOS answer needs to be conversational text. When appropriate,
the agent may respond with a structured view (e.g. a two-column weekend summary with weather,
events, and a garden insight) instead of a paragraph describing the same thing.
**Reason:** A "What's this weekend look like?" question is better answered by rendering the
actual weekend than by prose about it. Not implemented — `/ask` (Milestone 7) is
conversational-text-only today; this depends on ADR-048's generative UI primitives existing
first.

### ADR-048: Generative UI uses controlled primitives, never free-form model HTML

**Decision:** If/when ADR-047 is built, AI-generated views must be composed from a fixed set
of application-defined UI primitives (e.g. `Timeline`, `WeatherSummary`, `Insight`,
`MetricTrend`) selected and arranged by the model, never arbitrary HTML the model writes
directly.
**Reason:** Extends ADR-005's "tools, not raw access" boundary to the presentation layer —
keeps design consistency, accessibility, and security guarantees even when the agent is
choosing what to render. Not implemented; a prerequisite for ADR-047, not yet needed since
there's no generative UI today.

### ADR-049: AI is embedded intelligence, not a bolted-on chatbot destination

**Decision:** Prefer AI surfacing through natural-language Quick Add, generated summaries,
Feed compression, contextual recommendations, and adaptive views over treating `/ask` as the
only place AI shows up.
**Reason:** Restates ADR-037/ADR-009's "AI is additive, not load-bearing" from the
opposite angle — the goal isn't just that the app works without AI, it's that AI should feel
woven into ordinary interactions rather than confined to a chat panel. `/ask` remains the
main AI entry point today; other embedding points (Quick Add, Feed compression) are future
work, not yet built.

### ADR-050: Ask LifeOS is a universal command surface

**Decision:** A lightweight Ask LifeOS entry point should be reachable throughout the
application, not just at `/ask`, and should handle both questions ("What's happening
today?") and imperative requests ("Add milk to groceries.") without the user needing to know
which domain owns the data.
**Reason:** Already the intended shape of the Milestone 7 agent (tool registry spans
today/tasks/routines/lists/pets/money/weather/calendar) — this ADR extends *reachability*
(available from anywhere, not just one page) rather than changing the underlying agent
design. Milestone 8 (write tools) and broader reachability are both still open.

### ADR-051: LifeOS distinguishes obligations from interests

**Decision:** Maintain a hard conceptual line between "things that need me" (appointments,
medications, bills, critical failures) and "things I may enjoy knowing" (RSS, sports news,
music, tech news) — interests default to Feed and are promoted into TODAY/NOW only when
context makes them genuinely relevant.
**Reason:** This is the general principle that ADR-020/ADR-024 already implemented
concretely for Sports vs. RSS: a favorite team's *game* is an opt-in scheduled obligation
(TODAY-tier, ADR-036), while a sports *article about* that team is an interest (FEED-tier,
ADR-038). Already implemented for Sports and Feed; the general principle now applies to any
future domain.

### ADR-052: Feed provides closure, not endless consumption

**Decision:** Feed should have a natural stopping point — "3 things worth seeing... You're
caught up" — rather than open-ended infinite scroll as the default interaction.
**Reason:** Extends ADR-021 ("no traditional infinite social feed") with the specific
closure framing "you're caught up." **Not yet implemented:** the current `/feed` page
(`components/feed/feed-items-list.tsx`) is a plain reverse-chronological list of up to 60
items across all subscriptions with no digest/compression or "caught up" end state — flagged
in ROADMAP.md as a real gap against this principle, not an oversight.

### ADR-053: LifeOS may learn attention preferences (deferred)

**Decision:** Over time, LifeOS may adapt prioritization from observed behavior (e.g. "user
almost always opens pet reminders → increase pet-care relevance"). Any such learning must
stay inspectable, reversible, bounded, and shown to the user in plain language ("LifeOS has
learned: ...", with an edit affordance).
**Reason:** Extends ADR-017's "deterministic first, LLM assists later" stance to
personalization specifically — learned weighting adjusts the existing deterministic scorer,
it doesn't replace it with opaque model judgment. Not implemented — there's no behavior
tracking or preference-learning today (ADR-011's implementation note already flags
user-preference weighting as unimplemented).

### ADR-054: Learned behavior must never silently suppress high-impact priorities

**Decision:** Personalization (ADR-053) may tune low/medium-priority relevance but must
never conclude, from repeated dismissal, that a high-consequence category doesn't matter.
Financial obligations, medication, critical appointments, severe weather, and safety retain
minimum priority floors regardless of learned preferences.
**Reason:** A direct safety rail on ADR-053 — without it, "user keeps dismissing credit-card
reminders" could quietly train the system to stop surfacing them, which is the failure mode
personalization must never produce. Not yet applicable in code (no personalization exists
yet), but binding on ADR-053's eventual implementation.

### ADR-055: Family coordination is a first-class future capability

**Decision:** Design the repository so it can eventually represent multiple household
members (each with their own context: home/work/school), used for coordination insights
("everyone should be home by 5:45, rain starts at 6"), not surveillance.
**Reason:** `user_id` already exists on every domain table (ADR-012 notes this was
deliberate from the start — "multi-user is additive, not a rewrite"). This ADR commits to
actually building the household-coordination layer on top of that eventually. Not started;
still single-user today.

### ADR-056: Family data needs explicit ownership and visibility levels

**Decision:** Future multi-user data should support visibility levels — `PRIVATE`,
`HOUSEHOLD`, `SELECTED` (specific members), `SYSTEM` (derived household-level info) — and
the AI agent must respect the same permissions as the UI.
**Reason:** A household repository (ADR-055) must not silently imply every member can see
every other member's data. Extends ADR-005/ADR-028's tool-permission boundary to
member-to-member visibility, not just user-to-agent visibility. Not applicable yet — no
multi-user data model exists.

### ADR-057: LifeOS supports multiple presentation surfaces with distinct purposes

**Decision:** The same repository/Signal system may power distinct surfaces with different
jobs: Desktop ("organize and inspect" — richer navigation, history, configuration), Phone/PWA
("prioritize and act" — NOW/TODAY, quick actions, Ask LifeOS), and a future Ambient Display
("peripheral household awareness" — very low density, large type, minimal interaction).
**Reason:** Formalizes what CLAUDE.md already states informally ("the desktop/web
application primarily organizes... the mobile/PWA interface primarily prioritizes") and
adds Ambient Display as a third, not-yet-built surface with its own purpose (see ADR-058).
Desktop and Phone/PWA are both live today; Ambient Display is new scope.

### ADR-058: Ambient Mode is intentionally sparse

**Decision:** If/when an Ambient Display surface is built, it should stay closer to a clock
with occasional context ("4:32 · 76° Sunny · Dinner 6:30 · Cubs 7:05 · Everything else is
quiet") than a wall-mounted dashboard, remaining legible from a distance without demanding
inspection.
**Reason:** Direct extension of ADR-057's Ambient Display purpose. Not started — no ambient
surface exists yet; this sets the design bar for when one is built.

### ADR-059: LifeOS summarizes household systems without replacing their admin tools

**Decision:** Self-hosted infrastructure (Docker, Jellyfin, Navidrome, Home Assistant, NAS,
Pi-hole, Uptime Kuma, backups) may become LifeOS Sources, but LifeOS should summarize
meaningful state ("18 healthy, 1 warning — Immich restarted twice") rather than reproduce
Portainer/Grafana/native admin UIs.
**Reason:** Restates ADR-026 (systems monitoring as part of the personal environment) with
an explicit non-goal: don't rebuild the underlying tool's own administration surface. Not
started — no systems-monitoring integration exists yet.

### ADR-060: Media (Navidrome/Jellyfin) is context, interest, and action — future Sources

**Decision:** Navidrome (recently played, favorites, new music) and Jellyfin (continue
watching, recently added, household activity) will eventually be eligible LifeOS Sources.
Most media info belongs in Feed; specific items may be promoted into TODAY when context makes
them relevant (e.g. a movie-night routine surfacing "Continue Severance · S2E4" on a Friday
evening with no remaining obligations).
**Reason:** A concrete example of ADR-039/ADR-051's "obligations vs. interests" and
ADR-053's context-based promotion, applied to a specific future domain. Not started — no
media integration exists yet; the current Feed/Sports pattern (lazy-sync-on-read module,
shared non-user-scoped cache table) is the template to follow when this is built.

### ADR-061: Media memory must be handled carefully

**Decision:** LifeOS may eventually remember useful media context (movie-night preferences,
shared playlists, unfinished shows) but must not infer sensitive personal traits from
consumption history. Media history stays editable and subject to household visibility rules
(ADR-056).
**Reason:** A privacy guardrail specifically for ADR-060, since media-consumption inference
is a well-known way for "helpful personalization" to become invasive profiling. Not
applicable yet — no media data exists.

### ADR-062: Every aggregator must support a meaningful "nothing notable" zero state

**Decision:** Every aggregation surface (Server status, Feed, Home, Money, Today) should be
able to return a genuine, positive zero-result state ("Everything healthy.", "Nothing due.",
"Nothing needs you.") rather than manufacturing filler content to avoid looking empty.
**Reason:** The concrete, general-purpose version of ADR-039 applied to every current and
future aggregator, not just the Today page. Already true for Today (ADR-015: domains with
nothing relevant render no card) and for Sports/Feed (both show an explicit "not following
any teams yet" / "no items yet" empty state rather than fabricated content) — worth holding
future aggregators (Health, Money, a future Systems domain) to the same bar explicitly.

### ADR-063: Attention is a scarce, budgeted resource

**Decision:** The priority engine should treat NOW as attention-budgeted (e.g. normally 0–5
items), not unbounded. When more items qualify than the budget allows, rank, group related
items into one higher-level insight, summarize the rest, and let the user deliberately
expand rather than dumping every qualifying item into NOW.
**Reason:** `lib/today/ranking.ts` already caps NOW at 5 items (`NOW_CAP`) and TODAY at 8 per
domain group — the budget concept is implemented as hard caps today. What's not yet
implemented is the "group related items into one summarized insight" behavior described here
(e.g. six separate house-prep tasks compressing into "Guests Saturday — 3 house tasks, 2
shopping items, 1 setup task") — today's cap just truncates by score, it doesn't compress.
See ADR-019, which already called for this kind of compression at the content level; this
ADR frames it as a budget-management mechanism specifically.

### ADR-064: Importance and urgency are separate axes

**Decision:** Every attention candidate should be scored on two independent axes — intrinsic
importance (`CRITICAL`/`HIGH`/`NORMAL`/`LOW`/`AMBIENT`) and temporal urgency (how soon) —
rather than a single blended score. A HIGH-importance item far away sits in
Everything/Upcoming; the same item due today reaches NOW. A NORMAL-importance item far away
is invisible; due tomorrow it's TODAY.
**Reason:** This is close to, but more explicit than, the current implementation:
`lib/today/ranking.ts` already computes `urgencyPoints() + importancePoints() +
exceptionBonus()` as genuinely separate functions summed into one score — the two-axis
structure exists, but the *named importance tiers* (CRITICAL/HIGH/NORMAL/LOW/AMBIENT)
described here aren't explicit in the code; domain-based importance weights (task vs.
routine vs. sports, etc.) play that role today. Worth revisiting whether explicit tiers
would make the scorer easier to reason about — no immediate change required, since the
underlying two-axis principle already holds.

### ADR-065: Context, not domain, determines placement

**Decision:** A Signal's attention tier isn't fixed solely by which domain it came from.
The same domain can produce ambient information or an urgent one depending on context — e.g.
ordinary weather is ambient, but the same weather during a planned outdoor event is NOW;
a Cubs game is TODAY, but "user has tickets and must leave in 30 minutes" is NOW.
**Reason:** ADR-036 already implements one instance of this exact idea for
sports — "even happening today" a game stays TODAY rather than NOW, because a game is
context-independent nice-to-know, not an obligation. This ADR generalizes it: the deciding
factor is always context (does this specific instance require action from the user right
now?), not which domain module produced the signal. No immediate code change required; a
principle to apply when scoring future domains.

### ADR-066: LifeOS explains significant prioritization decisions

**Decision:** For significant recommendations (e.g. "skip watering today," "leave by 8:25"),
LifeOS should make the reasoning visible ("Why? 0.62in rain in the last five days + 0.3in
expected tonight"), not just state the conclusion.
**Reason:** Builds trust in both deterministic rules and any future AI-assisted
recommendation — extends ADR-017's "deterministic gives... explainability" from an internal
design property into a user-facing feature. Not yet implemented as a UI affordance (no
current recommendation surfaces a "Why?" explanation) — there are no AI-generated
recommendations yet for this to apply to; worth building alongside the first one.

### ADR-067: Mindfulness takes precedence over engagement

**Decision:** When product goals conflict, choose the option that better protects attention
and mental space. LifeOS will not intentionally optimize for daily-active-usage, session
length, streaks, gamification, or artificial urgency. Prefer success measures like
missed-obligation rate, unnecessary notifications avoided, and percentage of sessions ending
"caught up."
**Reason:** This is the design tie-breaker underlying nearly every other ADR in this batch —
worth stating explicitly as a standing rule for future feature decisions, not just an
implication of the others. Directly supports ADR-021/ADR-052 (no infinite Feed) and
ADR-055/ADR-056/2's "no engagement metrics" default.

### ADR-068: No productivity guilt

**Decision:** LifeOS language reports reality without moralizing. Avoid "You failed to
complete 4 tasks." / "You're falling behind."; prefer "4 tasks remain." / "2 routines are
overdue."
**Reason:** A concrete writing-style rule that follows from ADR-067 — the app should help the
user act, not manufacture guilt about what's unfinished. Worth auditing existing UI copy
against this over time (current copy is largely neutral already — e.g. "3d overdue" rather
than "you're 3 days late" — but this hasn't been treated as an explicit style rule until now).

### ADR-069: Recommendations respect human choice

**Decision:** When LifeOS recommends an action (e.g. "I'd skip watering — 0.8in rain
expected"), present it as a recommendation with an explicit alternative
("[Skip watering] [Keep scheduled]"), not as something already decided for the user.
**Reason:** Keeps automation from crossing into silent unilateral action — pairs with
ADR-057 of the original spec-derived ledger (agent tools require permission) by extending
the same "offer, don't impose" stance to deterministic recommendations, not just AI actions.
Not yet applicable — there are no proactive recommendations in the product yet (the garden
watering hint mentioned in ADR-030/ROADMAP.md is currently a passive Today note, not an
actionable recommendation with accept/decline).

### ADR-070: The repository is larger than the interface

**Decision:** LifeOS may know significantly more than any given screen displays. The
interface is a selective lens over the repository, not a mirror of it. "Stored does not mean
surfaced."
**Reason:** The organizing principle behind ADR-046 (progressive disclosure) and ADR-018
(suppression) — restated as a first-class architectural stance rather than an implication of
those two. Already true of the current implementation: e.g. `pet_events` history is fully
queryable on `/pets/[id]` but only upcoming events ever reach Today.

### ADR-071: LifeOS earns trust that permits disengagement

**Decision:** A long-term product goal is for the user to trust "if something important
happens, LifeOS will surface it" enough to stop individually checking Calendar, Weather,
Banking, Sports, RSS, etc. That trust must be earned through deterministic high-impact
rules, reliable integrations, transparent recommendations (ADR-066/069), conservative
suppression, auditability, and user correction — not claimed outright.
**Reason:** Names the actual product goal that everything else in this batch (and most of
ADR-011 through ADR-029) serves — worth stating as the destination, not just the mechanism.
Not a discrete implementation task; a lens for evaluating whether other work is actually
moving the product toward this goal.

### ADR-072: The primary loop is Observe → Understand → Surface → Act → Settle

**Decision:** The product's fundamental interaction loop is Observe (Sources collect data) →
Understand (normalize into structured state/Signals/context) → Surface (priority engine
decides if it deserves attention) → Act (user or agent takes action) → Settle (resolved
information recedes, interface returns to calm) → back to Observe.
**Reason:** Names the full loop that ADR-018 (suppression), ADR-044 (completion restores
calm), and ADR-060 of the original ledger (Sources → Signals → priority → NOW/TODAY/FEED)
each describe pieces of — useful as a single reference model for where a new feature's logic
belongs. "Settle" was the least-implemented piece when this was written; `NowList`/
`TodayGroups` now render an explicit calm confirmation when they empty out (ADR-044) — see
ADR-073 below for the same day's follow-on visual-design pass.

### ADR-073: Domain color is reserved for NOW; TODAY uses one shared neutral tone

**Decision:** `components/dashboard/domain-icon.tsx`'s `DomainAvatar` gained a `tone` prop —
`"vivid"` (default, unchanged: each domain's own bright color, e.g. blue for tasks, amber for
pets) or `"muted"` (one shared neutral gray circle for every domain). `NowList` (the NOW
tier) keeps `tone="vivid"`. `TodayGroupCard`/`TodayTasksCard` (the TODAY tier) now pass
`tone="muted"`. Domain-specific browsing pages (`/pets`, `/money`, `/calendar`, `/sports`
agenda/list views) are unchanged — still vivid.
**Reason:** The calm-computing doc's Color Principles section (an unnumbered section of
`docs/CALM_COMPUTING_DECISIONS.md`, not one of the 34 numbered ADRs merged as ADR-039–072)
says: "avoid turning every domain into a brightly colored permanent card... the calm state
should use restrained color... urgency gains visual distinction precisely because the normal
interface is quiet." Before this change, every domain avatar was permanently bright
everywhere it appeared, including in TODAY — the tier that's explicitly *not* urgent. Muting
TODAY's avatars while keeping NOW's vivid makes color track actual relevance (ADR-029/041:
"visual prominence should correspond to current relevance") instead of every section being
equally loud all the time. `DueBadge`'s own colors (amber "due", red "overdue") are
untouched — those already only appear when something is genuinely due-soon/overdue, so they
already were the kind of restrained, meaningful color use this principle asks for; they now
stand out more since the surrounding avatars are quieter. Domain pages outside Today were
deliberately left vivid — ADR-057/045 distinguish Desktop's "organize and inspect" role
(where per-domain color is useful, conventional wayfinding) from Today's attention-triage
role (where a wall of color undermines the "calm by default" point). Motion Principles and
the rest of the calm-computing doc's non-ADR sections (Notification Philosophy, Feed
Philosophy illustrated further, UI Direction's "spatial/adaptive" framing) remained
unaddressed as of this ADR — see ADR-074 for the same-week follow-on motion pass. Notification
Philosophy, Feed Philosophy's fuller digest framing, and UI Direction's broader
spatial/adaptive restructuring are still open.

### ADR-074: Completed/removed items collapse and recede; calm states settle in

**Decision:** Two new shared primitives implement DECISIONS.md's Motion Principles:
`lib/hooks/use-collapse-then.ts`'s `useCollapseThen()` hook and
`components/dashboard/collapsible-item.tsx`'s `CollapsibleItem` wrapper. Calling
`collapseThen(id, action)` from a checkbox/button handler marks that id as "collapsing" (the
matching `CollapsibleItem` — rendered as the list item itself, default `<li>` — starts a
220ms shrink/fade/slide-out CSS transition) and only fires the real mutation
(`action`, e.g. `complete.mutate(id)`) after the transition has had time to play, instead of
an instant hard cut the moment the query refetches. Wired into every place an item actually
leaves a list on user action: task complete (`today-tasks-card.tsx`, `task-list.tsx`), task
delete, pet event complete/delete (`pet-events-list.tsx`), list item delete
(`list-items.tsx` — check/uncheck itself is unchanged, still a persistent toggle that stays
visible crossed-out, not a collapse), and delete on finance reminders/accounts
(`reminders-list.tsx`/`accounts-list.tsx`) and calendar events (`agenda-list.tsx`).
Deliberately **not** wired into `routine-list.tsx`'s Complete/Skip buttons — `listRoutines()`
always returns all active routines regardless of completion state (ADR unwritten elsewhere,
but confirmed while building this: routines never leave that list on complete/skip, they just
get a new `next_due_at` and re-sort), so there's nothing to collapse there.
Separately, `app/globals.css` gained a one-shot `--animate-settle` keyframe (small fade + 4px
rise, 0.4s) applied to `NowList`'s "All done" card and `TodayGroups`' "Nothing else today."
card (both from ADR-044) via `animate-settle`, so the calm state visibly *arrives* rather than
popping in instantly.
**Reason:** Direct implementation of the source doc's "good uses" list — "completed attention
collapses and recedes" and "the interface settles after completion" — using only plain CSS
transitions and a small hook, no new dependency (no Framer Motion or similar): consistent
with this project's stated preference for simple architecture over added abstraction.
Confirmed via `grep` that none of the "avoid" list (`animate-pulse`/`animate-bounce`/
`animate-ping`, i.e. constant pulsing or decorative looping animation) exists anywhere in the
codebase already — nothing to remove, this pass was purely additive. The remaining two "good
uses" from the source doc — "related signals merge into one insight" (that's ADR-063's
attention-budget grouping, tracked separately as Milestone 12, not a motion concern) and "a
detail view expands from its originating object" (would need the browser View Transitions
API or a shared-element library; deliberately not attempted here — touches every
Today-item-to-detail-page navigation path across every domain, real scope, not a quick
addition) — remain open. Notification Philosophy and UI Direction's broader spatial/adaptive
restructuring are also still open — see ADR-075 for Feed's fuller digest framing.

### ADR-075: Feed's catch-up banner breaks new items down per subscription

**Decision:** `getFeedCatchUp()` (`lib/feed/service.ts`) now returns `newByFeed` (per-feed
counts) and `digest` — one compressed sentence like "11 from Hacker News, 7 from The Verge,
and 6 from BBC News" — alongside the existing flat `newCount`. `/feed`'s banner reads "N new
since your last visit — {digest}." instead of just a bare count.
**Reason:** The calm-computing doc's Feed Philosophy section describes a fuller digest than
ADR-052 first implemented — grouped by source, not just a total ("Since this morning: 3
things worth knowing. Sports — one update. RSS — one article."). We only have one source
*type* (RSS) rather than several (no Sports-news/Homelab/Media sources exist yet — see
Milestones 17/59 in ROADMAP.md), so the breakdown is per-subscription instead of
per-category; the shape (name where the new items came from, not just how many) is the same
intent. `joinWithAnd` — previously a private duplicate in both `lib/today/service.ts` (for
the At a Glance sentence, ADR-043) and here — was extracted to `lib/format.ts` as a shared
helper (along with `plural`) rather than kept duplicated a second time.

### ADR-076: Life Pulse v1 — a deterministic status readout, not a literal visual object

**Decision:** Implemented a first version of Life Pulse (ADR-030/042 — previously marked
"explore"). `lib/today/ranking.ts`'s `derivePulseState(now, today)` is a pure function
computing one of four states from the same NOW/TODAY buckets everything else on the page
already uses — no separate signal, no LLM judgment (ADR-017):

- `"urgent"` — any NOW item is overdue.
- `"attention"` — NOW has items, none overdue.
- `"active"` — NOW is empty but TODAY has something.
- `"calm"` — both NOW and TODAY are empty.

`TodayOverview.pulse` carries this to the client; `components/dashboard/life-pulse.tsx`
renders it as a small colored dot + one-line state description (e.g. "3 overdue.", "Nothing
needs you.") centered above the NOW/TODAY sections, shared between mobile and desktop rather
than duplicated per layout. Clicking it expands up to 3 "why" items — the top NOW items if
attention/urgent, or the top-scored TODAY items if active — reusing data already fetched for
the page, no new query. Nothing renders when calm and there's nothing to expand into.
`NowList`/`TodayGroups` now take a `pulse` prop and suppress their own "All done"/"Nothing
else today" cards when `pulse === "calm"`, since Life Pulse already states that once at the
top — otherwise a fully quiet day would show the same "nothing here" message three times
(Pulse, NowList, TodayGroups), which is the exact stacked-messaging problem ADR-044 already
fixed once for NowList/TodayGroups against each other. They still show their own card when
only partially empty (e.g. NOW empty but TODAY has items — pulse is "active") since that's
genuinely different information, not a repeat.
**Reason:** The source doc explicitly marks Life Pulse "explore," not a fully specified
design — the concrete choices made here: (1) a deterministic four-state status derived from
existing ranking data rather than a new independent scoring system, consistent with
ADR-017's "deterministic first" stance and avoiding a second source of truth for what's
urgent; (2) a real DOM element with color + text, not an animated/orbital graphic — the
source doc itself says "this does not require literal orbital graphics everywhere"; (3) no
continuous animation despite the name — Motion Principles explicitly rule out constant
pulsing, so the only motion is the existing one-shot `animate-settle` on page load, same as
NowList/TodayGroups' calm cards; (4) reveal-on-tap reuses in-hand data instead of a
navigation or a new fetch, keeping it self-contained. This is a v1: it doesn't yet address
Notification Philosophy (no notification system exists to categorize — needs Milestone 10
PWA infra first) or the fuller "spatial, adaptive... not sidebar + cards" restructuring the
source doc's UI Direction section describes — Life Pulse is a first, concrete step toward
that (a real attention-weighted visual anchor above the card stack), not the whole thing.

### ADR-077: PWA installability uses native Next.js conventions, no `next-pwa` dependency

**Decision:** Milestone 10 (PWA) implemented via Next.js's built-in App Router file
conventions rather than a wrapper library:

- `app/manifest.ts` — Web App Manifest, auto-served at `/manifest.webmanifest` with the
  `<link rel="manifest">` tag auto-injected; no manual wiring.
- `app/icon.tsx` / `app/apple-icon.tsx` — favicon and iOS home-screen icon, generated via
  `next/og`'s `ImageResponse` (same mechanism as OG-image generation) rather than static
  image assets — a solid `#2563eb` background with a white "L", matching the existing
  Sidebar logo's color. Next auto-injects the right `<link>` tags for these too.
- `app/pwa-icon-192/route.tsx` / `app/pwa-icon-512/route.tsx` — plain Route Handlers (also
  using `ImageResponse`) at explicit, predictable URLs referenced directly from
  `manifest.ts`'s `icons` array, marked `purpose: "any maskable"`. The `icon.tsx`/
  `apple-icon.tsx` convention only produces one size at an implementation-defined URL, which
  isn't precise enough for the manifest's required 192/512 sizes — a plain route sidesteps
  that ambiguity entirely.
- `public/sw.js` — a hand-rolled service worker (~50 lines), registered by
  `components/pwa/register-service-worker.tsx` (production-only — a service worker caching
  `next dev`'s constantly-changing output is a well-known source of confusion, so it's
  skipped in development). Deliberately minimal: cache-first for static assets, network-first
  with a cached fallback for page navigations, and `/api/*` plus every non-GET request always
  bypass the cache entirely and hit the network directly.
- `appleWebApp` in `app/layout.tsx`'s `Metadata` — makes iOS "Add to Home Screen" launch
  standalone (own window, no Safari chrome) instead of just a bookmark; iOS doesn't infer
  this from the Web App Manifest the way Android does.

**Reason:** `next-pwa` (the common community wrapper around Workbox) adds a real dependency
and has a history of rough edges with the App Router and Turbopack; Next 16's native
conventions cover everything actually needed here with zero new dependencies. The service
worker is intentionally not offline-first — LifeOS is fundamentally server/DB-backed (ADR-003:
"the database is the source of truth"), so caching API responses or queuing writes for later
sync would mean serving or accepting data that might already be stale/wrong, which directly
contradicts that principle. The SW's only jobs are (1) satisfying installability criteria and
(2) smoothing over a flaky connection for the page shell — not full offline support, which
isn't in scope here. This also removes the Notification Philosophy blocker noted in ADR-076 —
the PWA infra a real notification system would need (service worker, installability) now
exists — but the notification system itself (categorization, actual push subscriptions) is
still separate, unbuilt future work.

### ADR-078: Ollama per-call timeout raised from 120s to 300s

**Decision:** `lib/agent/providers/ollama.ts`'s `REQUEST_TIMEOUT_MS` raised from 120,000 to
300,000.
**Reason:** Found via a real deployment, not a hypothetical — the user's actual server runs
an Intel i5-3570 (2012, quad-core, no AVX2 per Ollama's own logged `system_info`), which is
markedly slower for CPU inference than the hardware this was originally tuned against.
Confirmed via Ollama's own logs that a request was reaching it and being processed correctly
(no error, no crash) but taking long enough that the app's client-side timeout fired first,
producing the same "AI model is currently unavailable" message as a genuine connectivity
failure — indistinguishable to the user, but a different root cause (slow, not broken). 300s
is generous enough to cover a cold first request (full model load, no prompt cache) on
noticeably weaker hardware, while still eventually giving up rather than hanging forever if
Ollama is actually unreachable.

### ADR-079: Attention-budget overflow gets a count line, not synthesized grouping (v1)

**Decision:** `bucketCandidates()` (`lib/today/ranking.ts`) now returns `overflow: Partial<
Record<CandidateDomain, number>>` alongside `now`/`today` — the count of items per domain
that exist beyond `TODAY_GROUP_CAP` (8), which were previously dropped from the returned data
with no trace at all once a domain hit the cap. `TodayGroupCard`/`TodayTasksCard` render one
small "+ N more" line (linking to the domain's full page) when a group has overflow, instead
of a hard, silent cutoff. `get_today_overview`'s agent tool exposes the same counts as
`additionalItemsNotShown` so the assistant can answer "are there more games this week"
accurately instead of only knowing about the visible 8.
**Reason:** This is ADR-063's "attention-budget grouping" from the calm-computing direction,
scoped down to what's actually buildable right now. The doc's own example — "Guests Saturday
— 3 house tasks, 2 shopping items, 1 setup task" — describes *thematic* grouping across
domains by real-world context (an upcoming event), which needs a notion of relatedness the
data model doesn't have yet (nothing currently links "guests this weekend" to the tasks/
shopping items it implies). Rather than build speculative relatedness/tagging logic to chase
that specific example, this v1 does the simple, honest version: acknowledge what's hidden
with a count, so "silently truncating" (the thing ADR-063 objects to) is actually fixed, even
though the richer synthesized-insight version isn't. Matches the same "compress instead of
list" instinct as Life Pulse's one-line state (ADR-076) — small, legible, not a new subsystem.

### ADR-080: Ambient Display v1 — a third route, not a themed version of Today

**Decision:** `/ambient` (`app/ambient/`) is a new top-level route, deliberately outside the
`(dashboard)` route group so it does not inherit the Sidebar/mobile-nav layout at all — its
own minimal `layout.tsx` just auth-guards (`requireUser()`, same session-based auth as every
other page — no separate kiosk/unauthenticated mode) and sets a full-bleed dark background.
Content, server-rendered from the same `getTodayOverview()`/`getCurrentWeather()` calls the
Today page uses (no new data layer): a live clock (`components/ambient/live-clock.tsx`,
ticks client-side every second — the page is meant to stay open for hours), current weather,
up to 2 upcoming items sorted soonest-first (shown regardless of pulse state — this is
peripheral "shape of the day" context, not an obligation list), and one line for whether
anything actually needs attention — reusing `derivePulseState()`'s existing CALM/ACTIVE/
ATTENTION/URGENT classification and its color mapping (`PULSE_DOT_CLASS`, exported from
`life-pulse.tsx` rather than duplicated). `components/ambient/auto-refresh.tsx` calls
`router.refresh()` every 5 minutes so weather/today data stays current without anyone
touching the device — matches the 30-min lazy-sync TTL other integrations use, just tighter
since this page has no user interaction to trigger a refresh otherwise. A small card on
Settings links to `/ambient` (opens in a new tab) for discoverability.
**Reason:** The source doc's own framing (ADR-057/058, condensed from the calm-computing
doc's "multiple presentation surfaces"/"Ambient Mode is intentionally sparse" sections) is
explicit that Ambient's job is different from Today's ("peripheral household awareness," not
"prioritize and act") — it needed its own route and layout, not a CSS theme or a `?mode=
ambient` query param bolted onto the existing page, since the actual chrome (Sidebar, tabs,
cards) has to be entirely absent, not just visually quieted. Reusing `getTodayOverview()` and
`derivePulseState()` rather than inventing ambient-specific data logic keeps this a
presentation-layer addition, consistent with ADR-057's framing of surfaces as different views
over the same repository, not separate subsystems. Real hardware (an old iPad, a wall
tablet) wasn't available to test against here — verified via the browser preview at a
reduced viewport instead; layout should hold up on a real device but hasn't been confirmed
on one.

### ADR-081: Pets/Lists "delete" fixed to be a soft delete, not a real one

**Decision:** Added edit UI to `/pets/[id]` and rename/delete UI to `/lists/[id]` — both
pages previously only rendered a static, unclickable name with no way to change or remove
anything, even though `pets` already had an unused `active` boolean and `lists` already had
an unused `archived` boolean sitting in the schema for exactly this. While building the
delete buttons, found that `deletePet` (already existed server-side, just had no UI trigger
before now) did a real `db.delete()` instead of using `active` — and `lists` had no delete
capability in the service layer at all. Both are now soft deletes:
`archivePet`/`archiveList` set the flag instead of removing the row, and `listPets`/
`listLists` already filtered on it.
**Reason:** `pet_events.pet_id` and `list_items.list_id` both have `onDelete: cascade`. A
real delete on a pet or list would have silently destroyed every event/item under it —
a dog's entire medication and vet-visit history, or every item ever checked off a recurring
grocery list — the moment someone clicked a delete button that, until this change, didn't
exist anywhere in the UI to click. Caught this while adding the delete UI, not from a bug
report; worth fixing now rather than shipping a delete button that quietly does more damage
than a user would expect from "remove this pet from my list." Lists got no restore UI in
this pass (would need one, symmetrically, if that's ever wanted); pets did — see ADR-082,
which reframes this specifically for pets as "retire," not "delete," and makes retired pets
stay visible with a restore option, rather than just quietly recoverable via direct DB access.

### ADR-082: Pet birthdays are derived, not stored; "retire" replaces "delete" for pets

**Decision:** Two related follow-ups to ADR-081, both pet-specific:

1. **Birthdays.** `lib/pets/birthday.ts`'s `nextBirthday(birthDate, now)` is a pure function
   (deliberately *not* `"server-only"` — no DB/secrets involved, so both
   `lib/today/service.ts` and the client-side `pet-header.tsx` import it directly) that
   computes the next annual occurrence of `pets.birth_date` and the age turned. It is **not**
   stored as a `pet_events` row — `pets.birth_date` stays the single source of truth, so
   there's nothing to keep in sync if it's edited later. It feeds Today's ranking pipeline as
   an ordinary `pet`-domain candidate with a new `eventType: "birthday"` value that exists
   only in the ranking layer's type (`PetCandidateInput`), not in the database's
   `PetEventType` enum — so it can't leak into the "add event" UI as something a user could
   manually log. Importance is weighted (25 points) so it crosses into NOW only when due
   today or tomorrow (45-point urgency tier) — well out (2+ days), it sits in TODAY like any
   other upcoming pet context, matching "elevate the information on the date," not
   permanently. Also shown on the pet's own page (`pet-header.tsx`) and exposed to the AI
   agent (`get_pets` tool) via the same function.
2. **Retire, not delete.** `archivePet`/`archiveList` (ADR-081) were parallel fixes for pets
   and lists, but for pets specifically, "delete" is the wrong word — the main real-world
   reason to deactivate a pet is that they've passed away. Renamed to `retirePet`, added
   `unretirePet` (restore), and `listAllPets()` (active + retired, sorted active-first) for
   `/pets` — retired pets now stay fully visible there with a "Retired" badge and a restore
   button, rather than disappearing from view like the original "delete" framing implied.
   `listPets()` (active-only) is unchanged and still what the AI agent and Today's
   birthday/event surfacing use — a retired pet shouldn't generate future obligations, but
   should still be easy to find and look back on. Caught a real bug during live
   browser-verification of this: the retire confirmation's mutation `onSuccess` invalidated
   the query and called `router.refresh()` but never reset the component's local `mode` state
   back to `"view"` — since retiring (unlike the old hard-delete flow) keeps the user on the
   same page rather than navigating away, the header stayed stuck showing the "Retire? /
   Confirm / Cancel" prompt even though the pet was already retired server-side. Fixed by
   adding `setMode("view")` to that `onSuccess`.
**Reason:** Both came directly from real product direction, not a spec — "elevate that
information on the date" (birthdays) and "I think it would be nice to always see them in the
pets pane regardless of living status" (retire). The birthday design choice (derived vs.
stored) mirrors ADR-036/079's existing convention for anything computed from a due-date-like
source rather than logged as its own event.

### ADR-083: Quick-add command palette is deterministic nav + task capture, not NL/AI

**Decision:** Added a global Cmd/Ctrl+K palette (`components/command-palette/command-palette.tsx`,
mounted once in `app/(dashboard)/layout.tsx`), scoped to exactly two actions: jump to any nav
destination, or quick-add a task by typing a title and pressing Enter. Hand-rolled rather than
adding `cmdk`/Radix — no overlay/portal primitive existed anywhere in the codebase yet, and
this doesn't need virtualized lists, multi-select, or nested pages, so a small bespoke
component was the smaller increment. A mouse-accessible "Quick add ⌘K" trigger was added to
the desktop sidebar for discoverability (same reasoning as ADR-080's Ambient Display link —
a keyboard shortcut nobody's told about might as well not exist), desktop-only for now since
`MobileNav` is a smaller, separate component and Cmd/Ctrl+K doesn't apply without a keyboard.
**Reason:** ADR-011 explicitly deferred this ("No quick-add command palette yet — the per-page
'add' forms cover this for now"); it was the last item in ROADMAP.md's "Polish gaps closed"
batch. Deliberately does **not** attempt ADR-049's eventual natural-language Quick Add vision
— the agent's write tools don't exist yet (Milestone 8, not built), and "functionality without
AI" is the stated preference; this is exact-title-in, exact-title-out, no parsing. Only wired
to tasks, not list items/pet events/etc. — task creation is the one universal, always-relevant
capture action regardless of what the user is currently looking at, whereas "add an item to a
list" needs to know *which* list, which the per-list page already handles well.

### ADR-084: Ambient weather backdrop is static mood, not an animated scene

**Decision:** Added a quiet backdrop behind the Today greeting header (`lib/weather/ambient.ts`
+ `components/dashboard/ambient-weather.tsx`, wired into `app/(dashboard)/page.tsx`) that reads
the current weather condition (OpenWeatherMap's `conditions` string, already captured by
`lib/weather/provider.ts`) into one of three states: a hazy blurred-cloud wash for
overcast/misty/foggy/snowy conditions, a cool rain-streak gradient texture for
rain/drizzle/thunderstorm, or nothing at all for clear skies/unmapped conditions/no weather
connection. Implemented as fully static CSS (blurred `rounded-full` divs, a
`repeating-linear-gradient` texture) — no looping animation, no JS-driven motion. The one
animation used is the existing one-shot `animate-settle` fade-in (globals.css, already used
for NowList/TodayGroups calm-state confirmations), which plays once on mount and stops.
**Reason:** A literal "drifting clouds"/"falling rain" ambient effect would be continuously
animated by nature — exactly what the Motion Principles doctrine (ADR-074,
`docs/CALM_COMPUTING_DECISIONS.md`) explicitly rules out ("continuous background animation,"
"decorative floating objects"). Reading weather through static color/shape instead of motion
keeps the "nice ambient touch" the user asked for while staying inside that doctrine rather
than reopening it case-by-case. The "or nothing" clear-sky/unconnected state follows the same
suppression instinct used everywhere else in the app (don't decorate when there's nothing to
say). Split the pure `conditions → mood` mapping into `lib/weather/ambient.ts` (unit-tested,
deliberately not `"server-only"`) rather than inlining it in the component, matching the
`lib/pets/birthday.ts` precedent for domain logic that's cheap enough to keep pure and
testable separately from its presentation.

### ADR-085: Mobile bottom nav is user-customizable, Today fixed at the geometric center

**Decision:** Added `users.bottom_nav_items` (`lib/db/schema/users.ts`) — a 4-slot nullable
array (`[leftOuter, leftInner, rightInner, rightOuter]`) a user can populate from
`bottomNavPool` (every `primaryNav` page except Today, plus Ask LifeOS; Settings is
excluded). `components/layout/mobile-nav.tsx` renders a **fixed 5-column CSS grid**, not a
dynamic-width flex row — Today always occupies grid column 3, so its on-screen pixel position
never shifts regardless of how many of the 4 slots are filled (1 to 4, validated server-side
in `lib/settings/bottom-nav.ts`'s `validateBottomNavItems` — at least one slot, no
duplicates, only real pool pages). Today also gets distinct visual treatment
(`components/layout/today-nav-link.tsx`: a raised accent-colored circle, not the small
icon+label every other tab gets) per the explicit request to make it "the main nav element."
Settings moved out of the bottom nav entirely into a new mobile-only top header
(`components/layout/mobile-header.tsx`) — freeing all 4 customizable slots for content pages
rather than needing one permanently reserved for app chrome. Configured from a new "Mobile
navigation" section in `/settings` (`components/settings/bottom-nav-form.tsx`): 4 independent
per-slot dropdowns (not a reorderable list) — this maps directly to the grid's fixed
positions, so there's no ambiguity about what "order" means once Today is pinned in the
middle, and no drag-and-drop UI to build for a 4-item list. Saving calls `router.refresh()`,
not a React Query invalidation — `bottomNavItems` isn't fetched via React Query at all, it's
read straight from the server layout (`app/(dashboard)/layout.tsx`) on every request.
**Reason:** Direct product request — "I want it to be the main nav element," "we can put 1-4
other pages in the nav in whatever order we want but the Today tab is always in the middle."
The fixed-grid approach (over a simpler "split chosen items evenly around Today" flex layout)
was a deliberate choice to make "always in the middle" literally true — an odd number of
chosen items can't split evenly on both sides of Today, so a dynamic layout would make Today's
screen position shift depending on configuration; the fixed grid guarantees it never does.
**Bug caught during verification:** `MobileNav` was initially written as a plain (Server)
component computing `NavItem`s (which embed a `LucideIcon` component reference) and passing
them as props to Client Components (`MobileNavLink`, `TodayNavLink`) — React can't serialize a
component reference across the Server→Client boundary ("Only plain objects can be passed to
Client Components from Server Components"), which crashed the entire page on real (non-desktop)
viewport testing. Fixed by keeping `MobileNav` `"use client"`, matching what the original
(pre-customization) `mobileNav` implementation already did — not just a style choice, a
requirement, since the icon lookups then happen entirely client-side with no boundary crossed.

### ADR-086: Calendar month/week grid views alongside the existing Agenda list

**Decision:** Added `components/calendar/month-grid.tsx` and `week-grid.tsx`, plus a
`components/calendar/calendar-view.tsx` switcher (Month/Week/Agenda tabs, prev/next/Today
navigation for Month and Week) replacing the bare `<AgendaList />` render on `/calendar`.
`GET /api/calendar/events` now accepts optional `start`/`end` query params — Month/Week pass
the visible grid's date range; the flat Agenda view (unchanged) omits both and still gets the
original fixed past-7/future-60-day window. Month shows a standard 7-column day grid with
event chips capped at 3 per day plus a "+N more" overflow count (the same overflow-compression
instinct as Today's TODAY-tier cards, ADR-079). Week is deliberately **not** an hourly
time-grid (Google-Calendar-style, events positioned by vertical offset) — just 7 day columns
each listing that day's events in full — since this app's events are lightweight personal
appointments, not a packed professional schedule that needs minute-level positioning.
**Reason:** Last item in ROADMAP.md's "Polish gaps closed" batch (originally deferred at
ADR-011: "No quick-add command palette yet — the per-page 'add' forms cover this for now" —
Calendar's month/week views were flagged the same way at Milestone 2 and stayed a placeholder
until now). The simpler week-as-list-columns design over a hopeful full hourly grid matches
CLAUDE.md's "prefer simple architecture" — build the version that's actually useful for this
app's data first, add hour-positioning later only if a real need shows up.

### ADR-087: Activity sessions (nightly stretch timer) get a dedicated table, not measurements

**Decision:** A new `activity_sessions` table (`lib/db/schema/activities.ts` — `userId`,
`activityType` free text, `startedAt`, `endedAt`, `durationSeconds`, `notes`), not a reuse of
the existing `measurements` table, even though `measurements` already has a generic
`type`/`value`/`unit` shape that could technically hold a stretch's duration. The deciding
factor: a *running* session needs to be resumable — reopening the ambient timer after a
reload or a backgrounded tab must show the real elapsed time, computed from `startedAt`, not
restart from zero. `measurements` has no notion of "in progress" (no start/end pair), so
supporting that would mean bolting improvised state onto a table designed for point-in-time
readings. `activity_sessions` is the single source of truth for both the live timer and the
Health page's log; nothing writes a derived copy into `measurements` (same "don't materialize
synced duplicates" instinct as pet birthdays, ADR-082).

Three new surfaces tie into this: `app/activity/start/page.tsx` (a server page, not a client
POST — resumes any already-running session via `getOrStartActiveSession` rather than starting
a second one, then `redirect()`s into the timer), `app/ambient/activity/[id]/page.tsx` +
`components/ambient/activity-timer.tsx` (nested under `app/ambient/` specifically to inherit
its chrome-free dark layout — DECISIONS.md ADR-057/058), and a real `/health` page
(`app/(dashboard)/health/page.tsx`) replacing what had been a `<ComingSoon>` placeholder since
Milestone 0 despite the `measurements` table existing that whole time — `lib/measurements/`
had no service layer at all until this change. "Activity" was added to `bottomNavPool`
(`lib/nav.ts`) as a normal selectable slot in the customizable bottom nav (ADR-085) — tapping
it is a plain `<Link>` to `/activity/start`, no special-casing needed in `MobileNavLink`,
since the "start a session" side effect lives entirely in that server page.

Deliberately scoped down from the original ask in two ways: (1) "notifications silenced" is
not literal — there's no push-notification system in LifeOS at all yet (DATA_MODEL.md's "Not
modeled yet" list). What's actually delivered is what Ambient Display always provides: a
full-screen surface with nothing else competing for attention. (2) Only one activity type
("stretching") ships — `activityType` is plain `text`, not a Postgres enum, so adding more
later needs no migration (same reasoning DATA_MODEL.md gives for `tasks.category`).

A real bug caught live during verification: `ActivityTimer` originally used React Query's
`useMutation` for the Done/Cancel actions, which threw "No QueryClient set" — `app/ambient/`
is deliberately outside the `(dashboard)` route group and has no `QueryClientProvider`
(only `app/(dashboard)/layout.tsx` mounts one). Fixed by dropping React Query for this
component entirely in favor of a plain `fetch` + local `useState`, which is also the more
honest tool here — this one-off action has no cached query data anywhere else on the page to
invalidate.

**Reason:** Direct product request, aimed at a specific real use case (a ~10-minute nightly
stretch) rather than a general-purpose timer feature. The dedicated-table decision follows the
same "does this need to be resumable/stateful, or is it a single reading" test that would
apply to any future timed activity (meditation, breathing exercises, etc.) — the schema is
built to extend to those without another migration.

### ADR-088: A dedicated `worker` process proactively syncs instead of lazy-on-read

**Decision:** Added a new long-running Docker Compose service, `worker` (`Dockerfile` target
`worker`, mirroring the existing `migrator` stage's "full `node_modules`, not the pruned
`runner` output" shape), running `scripts/worker.ts`. It calls a small registry of jobs
(`lib/jobs/registry.ts`) on independent intervals matching each domain's existing TTL —
weather/sports/feed every 30 min, calendar every 15 min — via one new function per domain:
`refreshAllDueWeatherLocations`, `refreshAllDueCalendarAccounts`, `refreshAllDueFavoriteTeams`,
`refreshAllDueFeedSubscriptions`. Every one of these **reuses the exact same provider-fetch-
and-upsert function** the lazy path already had (`fetchAndCache`, `syncAccount`, `syncTeam`,
`syncSubscription`) — none of that logic was rewritten. All that's new is the "which
accounts/locations/subscriptions across *every* user are due" query, since the existing
functions were only ever called scoped to one user at a time (triggered by that user's page
load). The lazy-sync paths (`getCurrentWeather`, `listEvents`, `getGamesForFavorites`,
`getFeedItems`) are **unchanged and still there** — the worker just means data is very
unlikely to actually be stale by the time someone loads a page, not that the fallback goes
away. If the `worker` container is down, the app works exactly as it did before this ADR.

No job-lock/run-history table — a single dedicated worker process (this is a self-hosted
personal app, not horizontally scaled) with an in-memory "already running" guard per job is
enough to stop a slow run from overlapping its own next tick; observability is stdout only
(`docker compose logs worker`). Sports/feed don't dedupe two users favoriting the same
team/subscribing to the same feed URL into one provider call — `lastSyncedAt` is a per-row
column with no shared per-team/per-feed sync state to bump instead, and the dedup savings
don't matter much at this app's actual scale.

Two real bugs caught building this, both from `tsx scripts/worker.ts` running **outside
Next.js's bundler** for the first time in this codebase (every other `tsx`-run script —
`migrate.ts`, `seed.ts` — happens not to import anything that touches this):
1. Every domain service file starts with `import "server-only"` — a package that isn't
   actually installed in `node_modules` at all; Next.js resolves it via its own internal
   bundler-level handling. Plain `tsx` (and Vitest, which already had the same problem —
   see `test/server-only-stub.ts`) can't resolve it and crashes with `Cannot find module`.
   Fixed with a new `tsconfig.worker.json` (extends the base config, only overrides `paths`
   to alias `server-only` to the existing Vitest stub) plus `tsx --tsconfig
   tsconfig.worker.json`. Deliberately **not** fixed by editing the shared `tsconfig.json`
   directly — Next's build also reads that file's `paths`, and aliasing `server-only` there
   would have silently defeated the guard for the real app too (a component that
   accidentally imported server-only code would resolve to the harmless stub instead of
   failing to build, turning a build-time catch into a silent runtime bug).
2. `docker stop`/`docker compose down` didn't trigger `scripts/worker.ts`'s own
   `SIGTERM`/`SIGINT` handler at all — confirmed live (`docker stop` took the full ~10s
   grace period before Docker force-killed it, no shutdown log line ever printed). Root
   cause: the original `CMD ["npx", "tsx", ...]` makes `npx` PID 1 inside the container, and
   `npx` doesn't reliably forward signals to the process it spawns. Fixed by invoking
   `node_modules/.bin/tsx` directly as `CMD` instead of going through `npx` — verified live
   afterward: `docker stop` completed in ~0.25–0.35s with the shutdown log line present.

**Reason:** Referenced as a known gap since Milestone 3 (weather's rainfall-history/garden-
zone logic, spec §13, explicitly needs "a background job to collect snapshots over time") and
repeated near-identically in calendar/sports/feed's own code comments ("no background job
runner yet"). This doesn't build the rainfall-history/garden-zone feature itself, but removes
the actual blocker for it — snapshots now accumulate on a schedule regardless of whether
anyone opens the Today page. Reusing rather than rewriting the sync functions keeps this a
small, low-risk change: the worker is strictly additive infrastructure sitting in front of
code that was already correct and already tested by every page load that's exercised it so
far this project.

### ADR-089: PWA finalization — manifest polish + install affordance, still no offline data

**Decision:** Small, deliberately bounded follow-up to ADR-077's PWA v1, not a re-opening of
it. Added to `app/manifest.ts`: an `id` field (`"/"`, so browsers recognize re-installs across
deploys as the same app instead of risking a duplicate home-screen entry), `categories`
(`productivity`/`lifestyle`/`utilities`), and `shortcuts` (Today, Start stretching, Ask
LifeOS — long-press/right-click the home-screen icon for a direct jump). Shortcuts are
deliberately only real navigable URLs; there's no way to deep-link into a client-side-only
affordance like the command palette, so that wasn't a candidate. Also added
`components/pwa/install-button.tsx` — a small, self-suppressing "Install" button in a new
Settings card, built on the `beforeinstallprompt`/`appinstalled` browser events (Chrome/Edge/
Android; not standardized, no official DOM type, so a minimal local `BeforeInstallPromptEvent`
interface covers just the two members actually used). It renders nothing until the browser
actually offers to install the app, and nothing again once installed — no separate
"is this installable" check needed, and no fallback UI to design for browsers that never fire
the event at all (notably Safari/iOS), which is why the Settings card's text also states the
manual "Add to Home Screen" path for those users directly.

**What this deliberately does NOT touch:** ADR-077 explicitly ruled out an offline-first
service worker — "caching API responses or queuing writes for later sync would mean serving
or accepting data that might already be stale/wrong, which directly contradicts [ADR-003, DB
is source of truth]." That reasoning hasn't changed, so `public/sw.js` is untouched here:
still network-first for navigations with a cache fallback (resilience against a flaky
connection, not an offline data store), still no background sync, still no push. The actual
notification system (categorization, real push subscriptions) is also still separate, unbuilt
future work, same as ADR-077 already said.

**Reason:** Direct request to "finalize into a PWA." Interpreted as auditing what ADR-077
deliberately left out vs. what was just an oversight, and only fixing the latter —
`shortcuts`/`categories`/`id` are zero-risk manifest completeness, and a custom install
prompt is a real, previously-missing discoverability gap (before this, installability relied
entirely on each browser's own, often well-hidden, native UI). Offline-first stays a
deliberate non-goal, not a gap.

### ADR-090: Color restraint pass 2 — one desaturated accent, not three independent blues

**Decision:** Direct design feedback on a live screenshot identified three separate
full-saturation blue elements competing for attention at once — the mobile bottom nav's
active-tab filled circle (`bg-blue-600`, ADR-085), the sidebar/mobile-header logo tile
(`bg-blue-600` square), and the Life Pulse "active" status dot (`bg-blue-500`) — plus
inconsistent icon stroke weights making some nav icons (`Trophy`, `HeartPulse`) read as
bolder/"filled" next to thinner ones (`Sun`, weather/routine icons), even though no icon in
the codebase actually uses an explicit `fill` — lucide-react renders every icon stroke-only
by default, so the perceived weight difference was purely inherent glyph density at the
uniform default `strokeWidth={2}`.

Four changes, applied together:
1. **One accent color token.** `app/globals.css` gained `--accent`/`--accent-dark` (`#5b8fd6`
   / `#7ea6e3` — desaturated relative to Tailwind's default `blue-600`/`blue-500`), exposed
   as Tailwind utilities (`bg-accent`, `text-accent-dark`, etc.) via `@theme inline`. There
   was no accent/primary color token anywhere before this — every blue was a raw Tailwind
   class or a duplicated hex string across `sidebar.tsx`, `mobile-header.tsx`,
   `today-nav-link.tsx`, `life-pulse.tsx`, `app/icon.tsx`, `app/apple-icon.tsx`, and both
   `app/pwa-icon-*/route.tsx` files — all now reference the same two tokens.
2. **Today tab dropped its filled circle** (`components/layout/today-nav-link.tsx`) — no
   background shape at all now, just a size/weight/color shift (larger icon than the other
   tabs, `font-semibold`, accent color only when actually on `/`, muted gray otherwise) — the
   calmest of the three options offered ("no background shape," vs. an underline or a
   low-opacity tint). Still reads as the nav's primary element per ADR-085's original "main
   nav element" request, just through restraint instead of a loud, permanently-colored shape.
3. **Logo went monochrome/outline** (`sidebar.tsx`, `mobile-header.tsx`) — an outlined
   neutral square instead of a solid accent-filled tile, so it sits at the same visual weight
   as the "LifeOS" wordmark next to it. The standalone app-icon assets (favicon, apple-touch-
   icon, the two PWA manifest icon routes) kept a filled background — icons need a solid fill
   to stay legible at 16-32px, a different constraint from in-app chrome — but recolored from
   the old vivid `#2563eb` to the same softened `#5b8fd6`.
4. **Icon stroke width unified to `1.75`** (down from lucide's default `2`) across every nav
   render path (`NavLink`, `MobileNavLink`, `TodayNavLink`) and the two other places icons
   were flagged (`DomainAvatar`/`DomainIcon` in `components/dashboard/domain-icon.tsx`,
   `WeatherCard`'s condition icon) — a uniform, slightly thinner stroke makes visually denser
   glyphs (`Trophy`, `HeartPulse`) read closer in weight to sparser ones (`Sun`) without
   touching every icon in the app; scoped to the components actually named in the feedback.

After this pass, the Life Pulse "active" dot is the *only* remaining solid accent fill in the
whole app — exactly the "just the status dot, nothing else needs to compete with it" framing
from the feedback. Domain-specific vivid colors (ADR-073's NOW-tier `DomainAvatar` colors:
amber pets, violet routines, emerald financial, etc.) are unrelated and untouched — that ADR's
restraint is about *when* a domain earns color (NOW vs. TODAY), this one is about the app's
own chrome having a single, quieter accent instead of multiple loud ones.

**Reason:** Direct, specific product feedback aimed at a real perceived problem ("your eye
snaps straight to the nav bar instead of the content"), not a general aesthetic preference —
the diagnosis (three independent saturated blues + inconsistent icon weight) was concrete and
independently verifiable in the code before any change was made (confirmed via a full grep of
every `blue-600`/`blue-500`/`sky-` occurrence and every icon render site). Consolidating to a
single named token, rather than just swapping in different Tailwind shades ad hoc, makes the
next "how loud should this be" decision a one-place change instead of a repeat of this same
multi-file audit.

### ADR-091: Challenges — bounded multi-habit programs (the "75 Hard" shape)

**Decision:** New domain, three tables (`lib/db/schema/challenges.ts`): `challenges` (name,
`start_date`, `duration_days`, `status`), `challenge_habits` (the fixed set of things tracked
daily, defined once at creation — not an ever-editable to-do list, matching how a real program
like 75 Hard actually works), and `challenge_completions` (one row per habit+calendar-day
marked done, `unique(habit_id, date)` so the checkbox is a toggle, not an accumulating log).
`day_number` ("Day 23 of 75") is computed fresh from `start_date` on every read
(`lib/challenges/day.ts`, pure and unit-tested), never stored — same "don't materialize a
derived value that can drift" instinct as pet birthdays (ADR-082) and rainfall-day math.

Full CRUD at `/challenges` (list + "start a challenge" form, with a one-click "Use 75 Hard"
fill for the specific example that prompted this) and `/challenges/[id]` (today's checklist +
a full habit × elapsed-day progress grid). The grid is the actual "journal" — cells for *any*
elapsed day are clickable, not just today's, so a forgotten check-in from three days ago is a
click to fix rather than permanently lost, rather than shipping a read-only history view next
to a separate today-only checklist. Also added `getActiveChallengeSummary()` and a new
`ChallengeCard` on the Today page (both mobile and desktop) — self-suppressing like
`WeatherCard`/`HealthCard` when there's no active challenge, and deliberately surfaces only
the single most-recently-started active challenge (not a wall of cards for every challenge
that's ever existed) so Today stays about *today*.

`deleteChallenge` is a real hard delete, unlike pets/lists (ADR-081) — a challenge's
completion history has no reference or value outside that specific challenge, so there's no
"accidentally destroyed something with lasting significance" risk a soft delete guards
against; same reasoning as `activity_sessions` (ADR-087).

**Reason:** Direct product request: "occasionally I like to participate in a challenge like
75 Hard... mostly add a journal feature into the app so I can add an item I want to track and
then mark it off when I complete, and see for that specific program how I am doing." The
three-table shape (challenge / habits / completions) is deliberately distinct from routines
(`lib/db/schema/tasks.ts`) — routines are indefinitely recurring single tasks with no concept
of a bounded program or "day N of D," which is the entire point of this feature.

### ADR-092: Weight tracking gets a hand-rolled SVG chart, no charting library

**Decision:** `lib/measurements/service.ts` gained real read/write beyond
`getLatestMeasurement` — `addMeasurement`, `listMeasurementsInRange` (filtered by a new
`lib/measurements/range.ts`: `30d`/`90d`/`6m`/`12m`/`all`, pure and unit-tested, same
convention as `lib/challenges/day.ts`), and `deleteMeasurement`. `GET`/`POST
/api/measurements` and `DELETE /api/measurements/[id]` expose it. The Health page's static
"Latest measurement" card became a full `WeightCard`
(`components/health/weight-card.tsx`): the latest reading, a line chart with a range toggle
(`components/health/weight-chart.tsx`), an entry form defaulted to the user's
`unitsSystem`-derived unit (`lb`/`kg`), and a recent-entries log with delete
(`components/health/weight-log.tsx`).

The chart itself is a ~120-line hand-rolled `<svg>` — `viewBox`-scaled path/circles computed
from min/max value and min/max timestamp, native `<title>` tooltips on each point, styled
entirely with the app's own `--accent`/`--accent-dark` tokens (ADR-090) — not a charting
library. No chart dependency exists anywhere in this codebase yet, and the actual ask ("a
pretty simple and theme appropriate line chart" with a handful of range buttons) doesn't need
anything a library provides that a small bespoke component can't: no zooming, no multi-series,
no complex interactions. A bespoke chart also automatically matches the accent color and
light/dark theme instead of fighting a generic library's own default styling — more "theme
appropriate" than adding a dependency would have been, not the reverse.

`type` stays a free-text column (matches `tasks.category`/`challenges.status`'s established
open-ended reasoning) — the UI only exposes "weight" today, but nothing in the schema or
service layer is weight-specific, so a future measurement type needs no migration.

A real bug caught live during verification: `WeightLog`'s delete handler originally only
called `router.refresh()` (correct for `WeightCard`'s server-fetched `latest` prop) but never
invalidated the `["measurements", ...]` React Query caches that the chart and the log itself
actually read from — `router.refresh()` only re-runs server components, so a deleted entry
would keep showing in the chart/log until a manual reload. Fixed by also calling
`queryClient.invalidateQueries({ queryKey: ["measurements"] })` (the same broad-prefix
invalidation `NewWeightForm`'s add mutation already did correctly).

**Reason:** Direct product request — "weight is important so I want to be able to add that in
with the date and see a pretty simple and theme appropriate line chart with some options like
last 30d, last 90d, last 6 months, last 12 months, all." The range set matches exactly what
was asked for, mapped 1:1 onto `MEASUREMENT_RANGES`.

### ADR-093: Task categories are a fixed, small set — revisiting a documented "not yet" from DATA_MODEL.md

**Decision:** `tasks.category` has been plain text since the original schema, explicitly
left open ("exact names can evolve... revisit if that changes," DATA_MODEL.md). This is that
revisit, from a product-planning doc's explicit design principle ("Fixed set to start — avoid
open-ended tag sprawl"). `TASK_CATEGORIES = ["Home", "Car", "Yard", "Chores", "Kids"]`
(`lib/db/schema/tasks.ts`) is validated at the API boundary (`z.enum(TASK_CATEGORIES)` in
`app/api/tasks/route.ts`) — the column itself stays plain `text`, no migration, so growing
the set later is still just a code change, matching the same pattern as
`activity_sessions.activity_type`/`challenges.status`.

`components/tasks/task-list.tsx` gained filter chips in the same segmented-pill style as the
Now/Today/Everything tabs (`mobile-today-tabs.tsx`) — reusing the existing visual language
rather than inventing a new one, per the planning doc's explicit principle. "All" (default)
groups tasks under quiet typographic section headers, one per category that actually has
tasks — no color-coding (the doc: "keep it typographic/quiet"), and categories with zero
tasks don't get an empty header.

A real bug caught live during verification: the grouped view's group order was hardcoded to
exactly the 5 fixed categories plus "Uncategorized," so an existing task with a category
value outside that set (the seed data's `"Maintenance"`, predating this fixed-set decision)
would silently vanish from the grouped view entirely — still in the database, just never
rendered anywhere. Fixed by computing the actual distinct category values present in the
data and grouping any non-fixed-set value under its own real label (alphabetically, after
the 5 known ones) rather than dropping it or mislabeling it as "Uncategorized."

**Reason:** Direct product request, from a written planning doc's explicit design
principles: a fixed category set (not open tags), filter chips matching an existing visual
pattern rather than a new one, and no color-coding.

### ADR-094: Grow tracking reuses the ranking engine — no bespoke Today card

**Decision:** New domain (`lib/db/schema/growing.ts`'s `grow_plants`: `strain`, `stage`
[`seedling`→`veg`→`flower`→`flush`→`harvest`], `date_planted`, `trichome_status`,
`last_checked_at`, `active`), but — unlike Challenges (ADR-091) and the Activity timer
(ADR-087), which are self-contained cards living outside the NOW/TODAY system —
**this one is wired directly into the existing ranking engine** as a new `CandidateDomain =
"grow"` (`lib/today/ranking.ts`), with the same importance weight as routines (`8` points)
and the exact same `TodayGroupCard` rendering every other domain uses
(`components/dashboard/today-groups.tsx`). No `GrowCard` component exists. This was an
explicit instruction in the planning doc that prompted it: "modeled on the Routines card
pattern... Reuse existing patterns... don't invent new visual languages per feature."

"Day N" and "next check due" are both computed fresh from `date_planted`/`last_checked_at`
on every read (`lib/growing/day.ts`, pure and unit-tested) — same "don't store a derived
value that drifts" reasoning as pet birthdays and challenge day-counts. A harvested plant
(`stage === "harvest"`) generates no further check candidates. Checking a plant into harvest
stage also auto-retires it (`active: false`) in the same action — reaching harvest and being
"done" are the same real-world moment, so there's no separate archive button, just a
"Restore" to reverse it (mirrors pets, ADR-082). Full CRUD at `/grow` (list, all plants
including harvested — same as Pets) and `/grow/[id]` (a single form that doubles as both
"edit" and "check in," per the doc's explicit "not a form-heavy tracker" instruction — no
separate edit mode). `photo_log` (referencing Immich assets) is deferred entirely — no Immich
integration exists yet (see the Feed/Log "Moments" item in the same planning doc); adding it
later is new UI on an unrelated field, not a schema change.

Added to `primaryNav`/`bottomNavPool` like every other domain (Pets, Money, Sports, etc.) —
the planning doc's own "new nav items are expensive, prefer tags/filters within existing
sections" principle was weighed against this app's own established precedent (every domain
gets a nav entry; the *mobile* nav's cost is already solved by ADR-085's customizable-slot
system, which makes a new domain opt-in per user rather than forced into daily view). This
is revisable if it turns out to compete for attention in practice.

**Reason:** Direct product request, from a written planning doc, explicitly modeled on an
existing pattern (Routines) rather than specified as new UI — the correct read of "reuse
existing patterns" here was structural (share the actual ranking/rendering pipeline), not
just visual (look similar but be a separate system).

### ADR-095: Workout logging — dual auth (session + webhook token), folded into Health

**Decision:** New `workouts` table (`lib/db/schema/workouts.ts`: `date`, `type`, free text
matching `tasks.category`'s open-ended reasoning, `duration_minutes`, `outdoor`, `note`,
`source`). Lives on `/health` as a new "Workouts" card, not a new route/nav entry — the
planning doc's own "prefer... existing sections" principle, and Health already hosts the
Activity/stretch log, so it's the natural home. The manual quick-log
(`components/health/quick-workout-log.tsx`) is exactly the two-tap flow the doc specified:
tap a type (Lifting/Run/Walk, each with a sensible default duration/outdoor flag) reveals an
inline duration stepper pre-filled with that default, tap "Log" confirms without needing to
touch the stepper — no full form for the common case.

`POST /api/workouts` is the one route in this app that accepts two different auth
mechanisms (`lib/auth/webhook.ts`'s `requireUserOrWebhookToken`): the normal session cookie
(the quick-log UI, running in-browser) or a static bearer token checked against a new
`WORKOUT_WEBHOOK_TOKEN` env var (opt-in — unset disables the webhook path entirely, verified
live: an unauthenticated POST with no token configured correctly returns 401). This exists
specifically so an external automation (Home Assistant, an iOS Shortcut, an NFC tag by the
rack) can log a workout without ever holding a browser session — the doc listed all three as
options and said "pick one to start"; this builds the one thing all three need (a working,
authenticated endpoint), not a specific automation, which is Geoff's own home-network setup
to wire up. `workouts.source` records which path actually authenticated the request
(`"session"` or `"webhook"`, returned by `requireUserOrWebhookToken` itself, not inferred
from header presence — an earlier version inferred it from "was an Authorization header
present," which would have mislabeled a session request that happened to also carry an
unrelated header).

**75 Hard integration** ("Challenges reads from the workouts table to auto-check the day's
workout requirement(s) instead of manual toggling"): implemented as a title-matching
heuristic (`lib/challenges/workout-match.ts`, pure and unit-tested), not a schema field or a
habit-linking UI — any challenge habit whose title contains "workout" auto-checks from that
day's logged workouts instead of being manually toggleable; if the title also says "outdoor"
it specifically requires a workout logged with `outdoor: true`. This is intentionally the
minimum needed for the actual 75 Hard preset's two workout habits ("Workout 1 (45 min)",
"Workout 2 (45 min, outdoors)") to work, not a general "link any habit to any data source"
automation-rules system nobody asked for. `lib/challenges/service.ts`'s
`getChallengeDetail`/`getActiveChallengeSummary` both merge workout-derived completions into
the same `completedSet` the manual-toggle path already produces, so the UI
(`challenge-detail.tsx`, `ChallengeCard`) didn't need new rendering logic — just a disabled
state + a small "from workout log" label on habits flagged `autoCheck`. Verified live: an
indoor "Lifting" workout correctly auto-checked "Workout 1" but not "Workout 2 (outdoors)."

A real bug caught live during verification: `WorkoutLog`'s entry list used
`formatDistanceToNow` on `workouts.date` — but unlike `measurements.measured_at`/
`activity_sessions.started_at` (real timestamps), `date` has no time component, so date-fns
parses the bare "YYYY-MM-DD" string as UTC midnight, producing a misleading "14 hours ago"
for a workout logged seconds earlier (the gap being however far the viewer's timezone sits
from UTC). Fixed by showing "Today"/"Yesterday"/the plain date instead of a time-sensitive
relative distance a date-only value was never precise enough to support. Checked every other
`formatDistanceToNow` call site in the app — all of them operate on genuine timestamps, so
this was isolated to the one new date-only field.

**Reason:** Direct product request, including the specific two-tap manual-fallback UX, the
"pick one auto-log trigger to start" framing (build the endpoint, not a specific automation),
and the explicit 75 Hard auto-check integration.

### ADR-096: Moments (Feed/Log) — LifeOS indexes Immich, it doesn't store photos

**Decision:** New `log_entries` table (`lib/db/schema/log.ts`: `user_id`, `immich_asset_id`,
`caption`, `location`, `occurred_at`) stores a *reference* to a photo already uploaded into
Immich, never the photo bytes — the doc's own "don't duplicate other systems' data" principle
applied literally. `user_id` covers the doc's spec'd `author_id` (same column every other
table already uses for the identical "hardcode to Geoff, structure for multi-user later"
reason — no need for a differently-named column on this one table).

Connecting to Immich follows the exact `weather_settings`/Weather pattern: a new
`immich_settings` table (`lib/db/schema/immich.ts`: instance URL, `api_key_encrypted`, album
ID) and a Settings → "Immich (Moments)" form (`components/settings/immich-form.tsx`,
`connectImmichAction` in `app/(dashboard)/settings/actions.ts`) that validates the URL/key/
album against Immich itself before saving anything, encrypts the key at rest via
`lib/security/crypto.ts`, and never sends it back to the client once saved.

**A credential-handling note, not a technical one:** Geoff supplied a live Immich API key
directly in chat, along with a docker-env block from another container. Per this
environment's standing rule against an agent ever entering API keys/credentials into a
field — even when a user explicitly pastes the value and says to use it — I did not write
that key into any file, migration, seed script, or the database myself. I built the Settings
form described above instead; the key only ever reaches the database when Geoff pastes it
into that form himself, through his own authenticated session. Two different album IDs were
also given (one embedded in the album share URL, one in the docker-env block) — rather than
guess, the form just accepts whichever ID gets entered.

`lib/immich/client.ts` is a thin wrapper around Immich's REST API (upload asset, add to
album, fetch a thumbnail), written against its current API shape (`x-api-key` header,
`POST /api/assets` multipart upload, `PUT /api/albums/{id}/assets` to link, `GET
/api/assets/{id}/thumbnail` for images) — isolated to one file since it's the one part of
this feature untestable from here without real credentials, so it's the one place likely to
need adjustment against Geoff's actual instance/version. The browser never talks to Immich or
holds its key: `GET /api/moments/[id]/image` fetches the thumbnail server-side and streams it
back, the same "proxy through our own server" shape as any other secret-gated integration in
this app.

`POST /api/moments` reuses `lib/auth/webhook.ts`'s dual-auth helper from ADR-095, generalized
to take an env-var name (`requireUserOrWebhookToken(request, "MOMENTS_WEBHOOK_TOKEN")`) so
Moments gets its own independent, opt-in webhook token rather than sharing
`WORKOUT_WEBHOOK_TOKEN` — a leaked/rotated token for one shouldn't affect the other. This is
the intended path for an eventual iOS Shortcut ("share photo → LifeOS"), since a real iOS
Share Sheet extension is outside what this Next.js codebase can build. The in-app manual
fallback (`components/moments/new-moment-form.tsx`: file picker + one-line caption) covers
both "capture from inside the app" and testing the flow without a Shortcut configured — it
posts `multipart/form-data` via a raw `fetch`, not `lib/api-client.ts`'s `apiFetch`, because
`apiFetch` hardcodes a JSON content-type that would break the browser-set multipart boundary
a `File` body needs.

**Display:** a flat chronological scroll (`components/moments/moments-list.tsx`), per Geoff's
direct answer to the doc's own explicitly-flagged open question ("group by day/week, or a
flat scroll?") — a photo journal reads naturally newest-first with a date under each entry,
and grouping headers add structure this isn't dense enough to need yet. Placement is a
segmented "RSS | Log" pill toggle inside the existing `/feed` page
(`components/feed/feed-tabs.tsx`, styled identically to `MobileTodayTabs`'s Now/Today/
Everything pills) — explicitly no new nav item, per the doc's "new nav items are expensive"
principle and its own placement instruction.

**Verification note:** without real Immich credentials available in this environment, the
upload/thumbnail path itself couldn't be exercised end-to-end. What was verified live
instead: `npm run build`/`lint`/`test` all pass; the Settings form renders and its fields
match the connect action's schema; the Feed page's Log tab correctly shows a "Connect Immich
in Settings" gate when unconnected; an authenticated `GET /api/moments` returns an empty
list; an authenticated `POST /api/moments` with a real (fake-content) file correctly resolves
through auth and validation and fails at exactly the right place — `409 "Connect Immich in
Settings before logging a Moment"` — confirming the whole chain up to the actual Immich call
is wired correctly; unauthenticated requests to all three routes return 401; deleting a
nonexistent entry returns 204 (idempotent, matching `deleteWorkout`); the thumbnail proxy
returns 404 for a nonexistent entry. The one thing that still needs a real pass once Geoff
connects his instance is the live upload → album-link → thumbnail-fetch round trip.

**Reason:** Item 6 of the 2026-08-14 planning doc ("Feed/Log 'Moments'"), including its own
"don't duplicate other systems' data" and "new nav items are expensive" principles, and
Geoff's direct answer on chronological-vs-grouped display.

### ADR-097: Mobile header back nav + per-plant Immich photo log

**Decision, part 1 — contextual back button:** `components/layout/mobile-header.tsx` becomes
route-aware (a client component using `usePathname()`, previously a static server component).
On a route nested one level under a known `primaryNav` destination (`/grow/[id]`,
`/pets/[id]`, `/challenges/[id]`, `/lists/[id]`), the header's left side swaps from the LifeOS
brand to a back button + label pointing at that parent list, instead of relying only on the
swipe-back gesture. Derived purely from the URL's first path segment matched against
`lib/nav.ts`'s `primaryNav` array — no per-page wiring, no new prop threading through every
detail page. This naturally and correctly excludes routes that aren't "list → detail" (e.g.
`/activity/start`, which isn't in `primaryNav` and also redirects into `/ambient/activity/
[id]`, a route outside the dashboard layout entirely with no header at all) — verified live:
`/grow/[id]` shows a "← Grow" back button linking to `/grow`, while `/grow` itself keeps the
LifeOS brand.

**Decision, part 2 — per-plant photo log:** Extends Grow (ADR-094) with its own photo log,
reusing the one Immich connection from Settings (ADR-096) but targeting a *plant-specific*
album rather than the global Moments album. New `grow_plants.immich_album_id` (nullable text)
and a new `grow_plant_photos` table (`lib/db/schema/growing.ts`) — reference-only, same "never
store the photo bytes" shape as `log_entries`. `user_id` is denormalized alongside `plant_id`
on `grow_plant_photos`, matching `pet_events`' existing convention for rows scoped to both a
user and a parent domain row.

Because Geoff has to paste in a plant's Immich album far more often than the one-time global
Settings connection (one per plant, ongoing), and what he actually has on hand each time is
the album's share URL rather than its id in isolation, a new pure helper
(`lib/immich/album-url.ts`'s `parseImmichAlbumId`, unit-tested) accepts either a bare id or a
full share URL and extracts the id — verified live by pasting
`http://192.168.1.23:2283/albums/ea79d265-9115-4e2a-8b9a-270012f69f88` into the plant form and
confirming the stored value was the clean id. A real bug caught by its own test suite before
this ever reached the UI: the bare-UUID branch returned the input verbatim instead of
lowercasing it like the URL-extraction branch did, so `EA79D265-...` and
`ea79d265-...` would have been stored as different strings for the same album — fixed by
lowercasing on both branches.

The album id field rides along in the same check-in submit as everything else
(`checkInPlant`'s input gained an optional `immichAlbumId`) rather than a separate save
action — consistent with that function's own existing design ("a check-in submit that changes
nothing else is still a valid action"), so bundling an infrequent config change into the same
form isn't a meaningful semantic stretch. Photo upload/list/delete
(`app/api/grow/[id]/photos/*`) is session-only, unlike Moments' dual-auth — this is manual
in-app capture only, no automation was asked for here. The upload path throws
`PlantAlbumNotSetError` if the plant has no album configured yet, or the shared
`ImmichNotConnectedError` (moved from being Moments-specific into `lib/immich/service.ts` so
both features throw and catch the same type) if Immich itself isn't connected at all — both
verified live via direct API calls returning `409` with the expected message, and a
thumbnail-proxy request for a nonexistent photo correctly returning `404`.

**A tooling note, not a code note:** live browser verification for this ADR hit a genuine
harness bug, not an app bug — the preview browser's viewport had collapsed to 0×0
(`window.innerWidth`/`innerHeight` both `0`), so every `preview_click` call was reporting
success while dispatching at off-screen coordinates that never reached any element,
silently swallowing the login form submission with no console error. Diagnosed by checking
`getBoundingClientRect()` on the submit button (`{x: -45, y: -61, width: 0, height: 0}` before
the fix) and confirmed fixed once `preview_resize` was called with explicit dimensions.
Authentication itself was then completed by submitting the login form's own `FormData` via a
direct same-origin `fetch()` (replicating exactly what a native form submission sends,
`redirect: "manual"` to detect the server's redirect without following it) rather than
continuing to fight the click layer — everything after that (test-plant creation, check-in,
photo-upload gating, cleanup) used direct authenticated `fetch()` calls against the real API
routes, which exercises the same server-side code a UI click would.

**Reason:** Direct product request from Geoff, made while using the app on his phone in the
Grow section: wanting a tap target back to the plant list after a check-in instead of only a
swipe gesture, and wanting to view a plant's photo history in-app "like we do for the Feed" —
with photos organized per-plant in Immich rather than mixed into the single global Moments
album.

**Follow-up fix (same day):** Geoff tried the feature and reported two real problems, both
caught from actual use rather than review: (1) "there's no save button" — the Immich album
field had been bundled into the check-in form's single "Check in" button, so saving an album
had no button that looked like it was for that; (2) the photo capture control was a bare,
browser-styled `<input type="file">` with `capture="environment"` already set (which does open
the device camera directly on mobile) — but it read as a generic file chooser, not an obvious
"take a photo" action, so the capability existed but wasn't discoverable.

Fixed both: the album field is now its own small form with its own "Save" button
(`PATCH /api/grow/[id]`, decoupled entirely from `checkInPlant` — check-in went back to only
handling stage/trichome/notes), and the file input on *both* Grow's per-plant upload and
Moments' upload (`components/moments/new-moment-form.tsx`, for consistency — same underlying
problem existed there too) is now visually hidden and triggered by a visible "Take Photo"
button. Verified live: saved an album via its own Save button (confirmed "Album saved."
feedback and the pasted share URL correctly resolved to its bare id), and confirmed the
"Take photo" button + empty-state Photos list appear immediately after saving, with no need to
also submit the unrelated check-in form.

### ADR-098: Due-date calendar-day math must use the user's timezone explicitly, never the runtime's

**Bug report:** "My routines are adding a day to the actual item... when I go into the Tasks
pane, everything is 1 day short of what the 'Today' page says."

**Root cause:** `lib/tasks/status.ts`'s `getDueSummary` — the single shared function behind
every due-date badge in the app (tasks, routines, pet events, financial reminders/accounts) —
computed `differenceInCalendarDays(now, dueAt)` on raw `Date` objects. `differenceInCalendarDays`
reads each Date's *local* year/month/day getters, which reflect whatever timezone the executing
JS runtime reports — not the user's actual timezone. That's invisible when one runtime renders
everything, but this function runs in two different runtimes for the identical data: the Today
page computes it **server-side** (`lib/today/ranking.ts`'s `scoreCandidate`, called from
`lib/today/service.ts`), and no `TZ` env var is set anywhere in this deployment (`Dockerfile`,
`docker-compose.yml`, `.env*` all checked — none set it), so Node defaults to **UTC**. The
Tasks/Routines/Pets/Money list panes (`components/tasks/task-list.tsx`,
`components/tasks/routine-list.tsx`, `components/pets/pet-events-list.tsx`,
`components/finance/reminders-list.tsx`, `components/finance/accounts-list.tsx`) instead call
the same function **client-side**, in the browser, in the user's real local timezone (e.g.
America/Chicago, several hours behind UTC).

For a user west of UTC, the server's clock crosses midnight hours before the user's actual
"today" does. During that window, the server-rendered Today page has already rolled a
due-tomorrow item into "due today" (reading as the routine's date having moved a day earlier
than the user set it — the "adding a day" symptom), while the browser-rendered Tasks pane,
still on the user's real "today," correctly shows it a day later — exactly the reported
mismatch. `user.timezone` (`lib/db/schema/users.ts`) already existed and was already used
correctly elsewhere (`lib/tasks/recurrence.ts`'s `computeNextOccurrence`, which converts through
`toZonedTime`/`fromZonedTime` before doing day arithmetic) — `getDueSummary` was just never
wired up to it, silently trusting whichever machine happened to execute the comparison instead.

**Fix:** `getDueSummary` now takes `timezone` as a required parameter (no default — this forces
every call site to be explicitly reviewed rather than silently inheriting a guess) and converts
both `now` and `dueAt` through `date-fns-tz`'s `toZonedTime(_, timezone)` before diffing, the
same pattern `computeNextOccurrence` already used. `lib/today/ranking.ts`'s `scoreCandidate`/
`bucketCandidates` gained an optional `timezone` parameter (defaulting to `"UTC"` — kept
default-able here since existing tests call these with 2 positional args and a UTC default
reproduces their exact prior behavior; only the leaf function needed to be strict), threaded
from `lib/today/service.ts`'s already-available `user.timezone`. All five client list
components gained a required `timezone` prop, threaded down from `requireUser()` in their three
parent server pages (`app/(dashboard)/home/page.tsx`, `app/(dashboard)/pets/[id]/page.tsx`,
`app/(dashboard)/money/page.tsx` — all three already called `requireUser()` but had been
discarding the result).

**Verification:** a new `lib/tasks/status.test.ts` pins the exact bug scenario — the same
instant (`2026-08-17T02:00:00Z`) evaluated against `"UTC"` gives `daysDelta: 0` ("due today")
while the identical instant evaluated against `"America/Chicago"` gives `daysDelta: -1` ("due
tomorrow"), reproducing precisely the Today-vs-Tasks-pane disagreement from the bug report,
plus a same-instant/different-timezones stability check and the existing overdue/due-soon/
upcoming classification boundaries. `npx tsc --noEmit` came back clean with no default on
`getDueSummary`'s `timezone` param, confirming every call site in the app was actually updated
(not just the ones remembered) — TypeScript would have failed to compile otherwise. Full
`build`/`lint`/`test` (78/78) pass. Live-checked the Tasks pane and Today page render the same
overdue task identically post-fix (`4d overdue` on both) — this particular case didn't
straddle a UTC/Chicago boundary at verification time, so it couldn't exercise the actual
day-disagreement (that requires the real wall clock to be at a specific hour, not something
reproducible on demand against a live dev server), which is exactly why the deterministic unit
test above — not a live click-through — is what actually proves the fix, matching this
codebase's established convention for pure date-math bugs (`lib/growing/day.test.ts`,
`lib/tasks/recurrence.ts`'s own tests, etc.).

**Reason:** Direct bug report from real use.

### ADR-099: Sports overhaul — every-header-links-home, and Sports rebuilt on sports-betting

**Part 1 — Today card headers link to their own page.** `components/ui/card.tsx`'s
`CardTitle` gained an optional `href` prop (wraps its children in a `Link`, one shared
implementation rather than each card hand-rolling its own) — wired into
`TodayGroupCard`/`TodayTasksCard` (via `domainMeta(domain).href`), `HealthCard` (`/health`),
and `ListsStrip` (`/lists`). `ChallengeCard`'s header was already a link to its specific
challenge — no change needed there. Weather and "At a glance" have no dedicated page, so their
headers stay plain text.

**Part 2 — Sports rebuilt on sports-betting, not ESPN.** Geoff runs a separate self-hosted app,
sports-betting (`/home/spooky/sports-betting`, Flask/Python), which already tracks live MLB/NFL
scores and FanDuel odds with its own in-process TTL cache — a strictly fresher, richer source
than the old ESPN-based sync, and the whole reason to replace it rather than bolt odds onto
the existing pipeline.

*Access method* (asked, not assumed — a direct cross-container DB query vs. a small internal
API materially differ in coupling): Geoff chose a small read-only HTTP endpoint over a direct
DB connection. `sports-betting/app.py` gained `GET /api/lifeos/games` — merges
`mlb_api.get_live_scores()`/`nfl_api.get_live_scores()` (score/status/period) with
`odds_api.get_odds_map()`/`lookup_game_odds()` (FanDuel moneyline + totals) into one clean
per-game JSON shape, plus two small additive helpers (`_mlb_start_times()`/
`_nfl_start_times()`) that re-read the *same* already-cached schedule payloads
`get_live_scores()` uses (same cache key, so this adds zero extra network calls) purely to
recover a start time neither function exposes — needed for Today's "upcoming game" ranking.
Gated on a shared-secret header (`X-LifeOS-Token` / `LIFEOS_API_TOKEN`, the one thing this app
had no auth pattern for at all) rather than left open, since it's reachable from outside
sports-betting's own dashboard. Investigation (a research subagent read the actual code before
any of this was written) found sports-betting has **no normalized team/game database table at
all** — live state is fetched on-demand and cached in memory only — confirming the "query the
database directly" idea from the original request wasn't actually viable; the small-API choice
was the only one that could actually work.

*Networking:* the two apps run as separate `docker compose` projects (different default
networks) rather than a shared one. Reached via sports-betting's already-published host port
(`SPORTS_BETTING_URL=http://host.docker.internal:5034`) instead of restructuring either
compose file to join a shared network — `docker-compose.yml`'s `web` service gained
`extra_hosts: ["host.docker.internal:host-gateway"]`, since that hostname doesn't resolve
automatically on Linux Docker Engine the way it does on Docker Desktop.

*LifeOS no longer stores game data at all.* The old `sports_events` table (ESPN sync/cache) is
dropped entirely — sports-betting already *is* the cache layer, so persisting a second copy
in Postgres would just be a second cache to keep in sync for no benefit. `lib/sports/
betting-client.ts` calls the endpoint live on every read (`cache: "no-store"`), configured via
`SPORTS_BETTING_URL`/`SPORTS_BETTING_TOKEN` env vars, not a per-user Settings form — this is
deployment-level config connecting two of Geoff's own self-hosted apps, the same category as
`DATABASE_URL`/`AI_BASE_URL`, not a personal third-party API key. Returns `[]` (not an error)
when unconfigured, so a fresh install's Sports page degrades to "no games" instead of a broken
page. No background job either — `lib/jobs/registry.ts`'s old `"sports"` entry is gone; there's
nothing left in LifeOS's own database for a proactive sync to keep warm.

*Favorite teams simplified.* `favorite_teams` drops the ESPN-id shape
(`sport_path`/`league_path`/`team_external_id`/`last_synced_at`) for a plain `(sport,
team_abbr)` pair — sports-betting has no team-id system, just abbreviations. Applied as two
migrations specifically to dodge drizzle-kit's ambiguous "is this a rename" interactive
prompt (which can't run non-interactively in this environment): migration one purely adds the
new nullable columns and drops `sports_events` (unambiguous — pure adds/a whole-table drop);
migration two drops the old columns and tightens the new ones to `NOT NULL` (pure drops,
also unambiguous). The existing 7 favorite-team rows have no possible mapping from an ESPN
team id to a plain abbreviation, so they're cleared as part of migration two — **flagged and
explicitly confirmed with Geoff first** (a data-loss decision, correctly caught by the
environment's own permission classifier when the migration was first attempted without that
confirmation).

Team search is gone too — sports-betting has no team-search endpoint, and a fixed ~62-team
league doesn't need one. `lib/sports/teams.ts` is a static, hardcoded MLB (30) + NFL (32) list
(abbreviation + full name); `components/settings/sports-form.tsx` is now a plain two-dropdown
picker (sport, then team) instead of a league-picker-plus-search-box-plus-results-list flow.

*Sports page: all games, not just favorites* (asked, then corrected once — Geoff's first
answer was "favorites only," matching the old behavior, then explicitly changed to "all games,
favorites elevated" once he saw the tradeoff spelled out). `lib/sports/grouping.ts` (pure, no
I/O, unit-tested — split out of `lib/sports/service.ts` specifically so the sport-then-
favorites ordering logic doesn't need a mocked `fetch` to test) groups every game sport-first
(baseball, then football, per Geoff's explicit order) and, within each sport, favorited teams'
games ahead of everyone else's — `components/sports/games-list.tsx` renders a divider line
between the two only when both groups are non-empty. `components/sports/game-card.tsx` is the
new one-card-per-game unit: teams, live score + period/inning detail when live, start time
when scheduled, and a compact moneyline/O·U odds line when sports-betting has one.

*Today stays favorites-only, deliberately different from the Sports page.* `lib/sports/
service.ts`'s `getFavoriteGames` (used by `lib/today/service.ts`, not `getGamesGrouped`) is
still scoped to followed teams — flooding Today with every MLB/NFL game happening today would
be exactly the "giant static dashboard" anti-pattern CLAUDE.md/UX_PRIORITIZATION.md explicitly
rule out; Today is about personal relevance, the Sports page is about browsing. Since games no
longer have a stable database id, Today's `CandidateInput.id` is a composite
(`${sport}-${away}-${home}-${startAt}`) — stable enough for one render pass (React key +
NOW/TODAY bucketing), which is all it's used for.

**A real bug found and fixed along the way, not sports-specific:** `app/api/feed/
subscriptions/route.ts`'s existing unique-violation check (`"code" in err && err.code ===
"23505"`) never actually worked — drizzle-orm wraps the real `PostgresError` (the one that
carries `.code`) under `.cause`, not on the caught error directly, so a duplicate feed
subscription was silently returning a raw 500 instead of the intended "You're already
subscribed" 409. Caught live while testing the identical pattern freshly written for
`app/api/sports/teams/route.ts` (add the same team twice → got a 500, not the expected 409).
Fixed with a new shared `lib/db/errors.ts` (`isUniqueViolation`, checks both `err.code` and
`err.cause?.code`) used by both routes, rather than patching two near-identical inline checks
that had already diverged once.

**Still open / Geoff's own next step:** sports-betting won't actually respond to the new
endpoint, and LifeOS's Sports page won't show live games, until Geoff restarts both containers
and sets a matching `LIFEOS_API_TOKEN`/`SPORTS_BETTING_TOKEN` value in each app's `.env` (a
data-loss-free, no-approval-needed step deliberately left to him rather than done here, per
the standing rule against an agent restarting a live app it doesn't own the uptime of).

**Follow-up fix (same day):** exactly that unfinished setup produced a real, confusing bug
report — "says Colorado Rockies — no games today, which is false." `fetchGames()`
(`lib/sports/betting-client.ts`) was deliberately designed to return an empty list rather than
an error when `SPORTS_BETTING_URL`/`SPORTS_BETTING_TOKEN` aren't set, so a fresh install
wouldn't show a broken Sports page — but that meant "not connected yet" and "checked,
genuinely no games" rendered as the exact same "No MLB or NFL games today" text, and the
former reads as a factual claim about today's schedule rather than a setup gap. Fixed by
threading a new `isConfigured()` check through `getGamesGrouped` → `GET /api/sports/games` →
`GamesList`, which now shows a distinct "Not connected to sports-betting yet — set
SPORTS_BETTING_URL/SPORTS_BETTING_TOKEN..." message instead. Verified live: with the
integration still unconfigured (as it is until Geoff completes the step above), the Sports
page now correctly shows the "not connected" message instead of the misleading "no games."

**Reason:** Direct product requests — a mobile-usage-driven request to make Today headers
tappable, and a "UI overhaul + can we query [sports-betting]?" request that got scoped down
through three rounds of clarifying questions (access method, network reachability, repo
access) into a small-API integration, then corrected once on page scope (all games, favorites
elevated, sport-grouped) based on Geoff's direct follow-up.

### ADR-100: Swipe-right-to-complete on NOW cards

**Decision:** `components/dashboard/swipe-to-complete.tsx` — a new pointer-event-based
gesture wrapper, no external gesture library (this is the one interaction in the app that
needs it; pointer events already unify mouse/touch on their own). Dragging a NOW row right
reveals a green checkmark growing in behind it; releasing past `COMPLETE_THRESHOLD_PX` (88px)
fires the row's existing "complete" action, paired with the same collapse-then-mutate motion
`useCollapseThen`/`CollapsibleItem` already use elsewhere (checkbox-based completes on
`TodayTasksCard`, etc.) — swiping isn't a separate completion path with its own visual
language, it's a second *trigger* for the identical one. Releasing short of the threshold
springs back to rest with no side effect.

Scoped to the domains that actually have a real, existing one-tap complete endpoint —
`task` (`PATCH /api/tasks/[id]` `{status:"done"}`), `routine` (`POST /api/routines/[id]/
complete`, the literal "Cat Litter" example from the request), `pet` events (`PATCH /api/
pets/_/events/[id]` `{completed:true}` — the `[id]` path segment is the pet id but
`completePetEvent` only ever scopes by `(eventId, userId)`, so it's an unused placeholder,
not a real dependency), and `grow` (`POST /api/grow/[id]/check-in` with an empty body — a
swipe is exactly the "yep, still fine" quick check-in `lib/growing/service.ts` already treats
as a valid action). Deliberately **not** wired up for `financial` (no mark-paid action exists
anywhere in the app), `calendar` (an appointment isn't "completable" the way a task is), or
`sports` (informational only) — `NowList`'s `getCompleteRequest()` returns `null` for those,
and the row renders as a plain (non-swipeable) link, same as before this ADR. A pet-domain
"birthday" candidate is excluded too — it's a computed occurrence with no underlying
`pet_events` row (DECISIONS.md's pet-birthdays note), so `RankedItem` gained an optional
`eventType` field (only populated for `domain === "pet"`) purely so the UI can tell a
birthday apart from a real event; it previously only existed on the pre-scored candidate
input, not the ranked output.

`NowList` itself moved from a plain (implicitly server-renderable) component to an explicit
client component with its own `useMutation` — needed for the swipe callback to actually fire
a request, mirroring `TodayTasksCard`'s existing `router.refresh()`-after-success pattern
exactly (NOW/TODAY placement and the pulse state all live in server-fetched `overview` props,
not a query cache, so completing something has to re-fetch the whole Today payload to
re-rank, not just locally remove one row).

**A real bug caught during live verification, not a testing artifact:** the first
implementation read `dragX` (React state) directly inside `handlePointerUp` to decide whether
the threshold was cleared. That works with genuine touch/mouse input, where pointerdown/move/
up naturally land in separate render cycles — but a fast swipe, or (as caught here) a
scripted pointer-event sequence dispatched within one synchronous script, can land
pointerdown/move/up in the *same* React batch, where a handler still closes over the
*previous* render's state value rather than the just-set one. Fixed by tracking the live drag
position in a ref (`dragXRef`, updated and read synchronously) instead of relying on the
state variable for the completion decision — state (`dragX`) still drives the CSS transform/
opacity for rendering, the ref is purely for the logic. Verified live: a swipe past 88px
correctly completed a test task (confirmed both via the DOM — the row disappeared from RIGHT
NOW — and via a direct API check once timing was accounted for, since the very first
same-tick verification attempt raced ahead of the mutation and initially looked like a false
negative); a swipe stopping at 40px correctly left the task open and visibly snapped the row
back to `translateX(0px)`.

**Reason:** Direct product request, using the day's own "Cat Litter" routine as the concrete
example ("swipe right to mark it complete vs going into the Routine section").

### ADR-101: Bare DueBadge isn't a date — accounts/reminders need the actual date shown

**Bug report:** a screenshot of the Money page's Accounts card — "Chase"/"Citi" rows each show
a "Statement closes" label with nothing next to it. No date, no badge, nothing.

**Root cause:** `DueBadge` (`components/dashboard/due-badge.tsx`) is, by design, an *urgency*
indicator, not a date display — it returns `null` outright unless `due.status` is `"overdue"`
or `"due_soon"` (within `DUE_SOON_WINDOW_DAYS = 3`, `lib/tasks/status.ts`). That's the right
behavior for the badge itself (a due date three weeks out genuinely isn't "urgent," so no
colored pill is correct there), but `components/finance/accounts-list.tsx` and
`components/finance/reminders-list.tsx` were both using `DueBadge` as the *only* thing
rendered next to a date — so a statement closing in three weeks, or a bill due in three weeks,
showed literally nothing: no date, no badge, no information at all. Confirmed live against
Geoff's real data: "Chase Sapphire" closes Sep 10 (24 days out) — invisible before the fix.
The identical bug independently affected `RemindersList`'s "Amex" reminder (due Aug 24, also
invisible) — caught while investigating the reported one, not a separate report.

**Fix:** both files now always show a plain formatted date (`format(date, "MMM d")`, e.g.
"Closes Sep 10" / "Due Aug 24") alongside the item, with `DueBadge` layered in underneath as
a secondary urgency indicator — it still renders nothing when there's nothing urgent to flag,
but that's fine now, since the date itself is always visible regardless. Verified live against
Geoff's actual "Chase Sapphire"/"Amex" data: after the fix, Chase Sapphire correctly shows
"Closes Sep 10" and the Amex reminder correctly shows "Due Aug 24" (previously blank), while
the near-term Chase Sapphire reminder still additionally shows its "Due tomorrow" badge.

**Not fixed in this pass, flagged separately:** the exact same root-cause bug also affects
`components/dashboard/today-group-card.tsx` — the shared card used for every domain group on
Today's TODAY tier (Calendar, Tasks, Routines, Pets, Money, Grow), which renders a bare
`DueBadge` too. Since TODAY includes anything within a 14-day lookahead
(`lib/today/service.ts`'s `LOOKAHEAD_DAYS`) but `DueBadge` only speaks up inside a 3-day
window, anything 4-14 days out across *every* domain on Today currently shows no date either
— a routine due in 8 days, a calendar event next week, all invisible-dated the same way. This
is a bigger, cross-domain fix (different domains want different date granularity — a calendar
event probably wants a time, a routine probably just wants a date) than the two-file scope
actually asked for here, so it's tracked as a separate follow-up rather than folded into this
fix silently.

**Reason:** Direct bug report from a real screenshot of Geoff's own account data.

### ADR-102: Extend the ADR-101 fix to every Today TODAY-tier group card

**Bug:** the follow-up flagged at the end of ADR-101 — `components/dashboard/today-group-card.tsx`
(the shared card behind every TODAY-tier group: Calendar, Routines, Pets, Money, Sports, Grow)
and `components/dashboard/today-tasks-card.tsx` (Tasks' own near-identical row, kept separate
since it's the one interactive/swipe-to-complete TODAY card) both rendered a bare `DueBadge`
with nothing else. `DueBadge` only speaks up inside `DUE_SOON_WINDOW_DAYS = 3`
(`lib/tasks/status.ts`), but Today's TODAY tier includes anything within `LOOKAHEAD_DAYS = 14`
(`lib/today/service.ts`) that still scores above zero in `urgencyPoints()`
(`lib/today/ranking.ts`) — so any item 4-14 days out, in any domain, rendered no date at all: a
routine due in 8 days, a calendar event next week, a grow check in 5 days.

**Fix:** both cards now always render a plain formatted date next to the title, with `DueBadge`
still layered in below it for urgency signaling once an item is actually close — same shape as
ADR-101. Granularity is per-domain rather than one blanket format, matching how each domain's
own dedicated page already formats dates where one exists: Calendar and Sports carry a
meaningful time of day (a 2pm meeting vs. a 7pm game start), so they use `"EEE h:mm a"` —
the exact pattern already established in `components/sports/game-card.tsx`'s scheduled-game
badge (`format(new Date(game.startAt), "EEE h:mm a")`). Tasks, Routines, Pets, Money, and Grow
only ever cared about the day, so they reuse ADR-101's `"MMM d"`.

TODAY-tier data crosses a server/client boundary — `TodayGroupCard` stays server-rendered, but
`TodayTasksCard` (and, transitively, `TodayGroups`/`MobileTodayTabs`/`page.tsx`) are client
components, and the page itself is rendered server-side where the process's own clock isn't
guaranteed to be the user's real timezone (ADR-098 hit this exact class of bug for due-status
math). Rather than reintroduce that bug for date *display*, both cards now take an explicit
`timezone` prop threaded down from `user.timezone` (the same convention already used by
`AccountsList`/`RemindersList`/`TaskList`/`RoutineList`/`PetEventsList`) and format with
`formatInUserZone` (`lib/format.ts`) instead of a bare `date-fns` `format()`.

**Reason:** Direct follow-up to ADR-101 — flagged there as a known, larger-scope instance of
the same bug rather than folded in silently, and fixed here as its own pass.

### ADR-103: Calendar/sports TODAY dates need the actual date, not just the weekday

**Bug report:** "the calendar card on Today just says Thu 8:00pm... saying thursday but it
being in two weeks isn't helpful." A direct, same-day follow-up to ADR-102's own fix — that
pass added a plain date/time to Calendar and Sports TODAY rows, but chose weekday-only
(`"EEE h:mm a"`, e.g. "Thu 8:00 PM"), copied from `components/sports/game-card.tsx`'s
scheduled-game badge. That format is correct in *that* card specifically — it only ever shows
*today's* actual games, so "Thu" can't be ambiguous there. `TodayGroupCard` is a different
context: TODAY's 14-day lookahead (`lib/today/service.ts`'s `LOOKAHEAD_DAYS`) means a Calendar
or Sports item can legitimately be one, two, or almost three Thursdays out, and weekday alone
doesn't distinguish them — exactly the ambiguity reported.

**Fix:** `components/dashboard/today-group-card.tsx`'s `formatItemDate` now uses
`"MMM d, h:mm a"` (e.g. "Aug 30, 8:00 PM") for Calendar/Sports — the actual date replaces the
weekday rather than sitting alongside it, keeping the label from growing past what this
narrow, right-aligned column comfortably fits. `components/sports/game-card.tsx` itself is
unchanged (still weekday-only) — it's the one context on this domain where that format was
never actually ambiguous, so there was nothing to fix there. Verified live against a
reconstruction of the reported case: a "Geoff off" event created 12 days out (Aug 30, 8:00 PM
America/Chicago) previously would have shown "Thu 8:00 PM"; after the fix it correctly shows
"Aug 30, 8:00 PM" in the Calendar TODAY group.

**Reason:** Direct, same-day bug report on the ADR-102 fix itself.

### ADR-104: Rain/snow ambient weather gets a scoped, reduced-motion-aware exception to Motion Principles

**Decision:** `components/dashboard/ambient-weather.tsx`'s rain and snow backdrops now animate
— individual falling raindrop streaks and snowflakes (with a gentle sway) layered on top of
the existing static mood tint. Clouds mood is unchanged and stays fully static. Both new
animations are applied via Tailwind's `motion-safe:` variant, so `prefers-reduced-motion:
reduce` users get the pre-existing static appearance — the first continuously-looping
animation in the app, so this was non-negotiable, not an afterthought. New keyframes
(`rain-drift`, `rain-fall`, `snow-fall`) live in `app/globals.css`; `lib/weather/ambient.ts`
gained a fourth mood, `"snow"` (previously folded into `"clouds"`), since falling flakes need
their own visual treatment distinct from the static cloud wash.

**Reason:** Direct, explicit user request — told about the conflict with ADR-074's "avoid
continuous background animation" rule beforehand and chose to override it, scoped to weather
only, not a general reversal. `animate-settle` and the "avoid continuous animation" rule
everywhere else in the app (NowList, TodayGroups, Life Pulse, etc.) are unaffected. First
implementation used percentage-based `transform: translateY()` for the fall distance, which is
a real CSS footgun — percentages in `transform` resolve against the *element's own* box, not
its container, so a 3px-tall snowflake moving "110%" only travels ~3px total and looked stuck
near the top. Fixed by switching to pixel-based fall distances matching the ambient header's
actual height (`min-h-28`, 112px — `app/(dashboard)/page.tsx` also gained that explicit
min-height, since the container previously only sized to fit two lines of greeting text, too
short for a falling-motion effect to read as anything). Verified live: injected each backdrop's
exact markup into a running preview, confirmed via `getComputedStyle` that `animation-name`/
`transform` were actually progressing (not just present as static classes), and visually
confirmed streaks/flakes now traverse the full header height instead of barely moving.

### ADR-105: Dashboard shell gains a time-of-day gradient; Card becomes semi-transparent

**Decision:** New `lib/theme/time-of-day.ts` buckets the current hour (in the user's
timezone) into morning/afternoon/evening/night and maps each to a subtle Tailwind gradient
class, applied to `app/(dashboard)/layout.tsx`'s `<main>` — replacing the flat
`bg-neutral-50`/`dark:bg-neutral-950` the page previously inherited from `<body>`. Scoped to
the authenticated dashboard shell only — not the login page, not the separate `/ambient` kiosk
route. `components/ui/card.tsx`'s `Card` gained `bg-white/85 ... dark:bg-neutral-900/80` +
`backdrop-blur-sm` (previously fully opaque) so the gradient is actually visible through card
content, reusing the same opacity+blur mechanism already established in
`components/layout/mobile-header.tsx`/`mobile-nav.tsx`.

**Reason:** Direct user request — the flat black dashboard background (especially with no
ambient weather backdrop active, e.g. clear skies) read as visually flat. Gradient shades stay
deliberately desaturated per ADR-090's restrained-color language — first pass used
`neutral-900`→`neutral-950` for every dark-mode bucket, which was nearly imperceptible (both
shades are within 0.06 lightness of each other); revised to a faint per-bucket color hint
(`amber-950`/`sky-950`/`orange-950`/`neutral-900`, each still fading to the same `neutral-950`
base) so the four times of day are actually visually distinct without becoming a bright
redesign.

Two more real problems only surfaced after the user checked the actual running app (not
caught by the initial live-preview pass): (1) Card's first-pass `/98` opacity was too close to
fully opaque to notice, especially in dark mode where card and page background are both
near-black — dropped to `/85`/`/80`. (2) `<main>`'s `overflow-y-auto` doesn't actually bound
its height (the outer flex wrapper uses `min-h-dvh`, a *minimum*, so `main` grows with content
instead of clipping it) — the real scrolling happens on `document`/`body`, so the gradient,
sized to `main`'s full (often much-taller-than-viewport) content height, washed out to its
"to" color well before the fold on any page longer than one screen — Settings, with its many
cards, was already past that point by the second card. Fixed by adding `bg-fixed` to `<main>`,
which anchors the gradient to the viewport instead of the scrollable content height, so it
stays visible (fading toward the edges, not gone entirely) no matter how far down a long page
you scroll. Verified live across all four gradient buckets, both color schemes, and — this
time — actual window-level scroll position on Settings (a genuinely long page, 3300px+) to
confirm the fix, not just a same-viewport screenshot.

### ADR-106: Workout-linked challenge habits stay manually toggleable; workouts gain backdated logging

**Decision:** `components/challenges/challenge-detail.tsx` no longer disables the check-off
button for a workout-matched habit (`habit.autoCheck`) — both the today's-checklist row and
every progress-grid cell are always clickable now. `applyWorkoutAutoCheck`
(`lib/challenges/service.ts`) is unchanged and still auto-fills the completion from a logged
workout; manual toggling is additive on top of that, not a replacement for it — "counts from
workout log" is now purely an informational label, not an explanation for why a button was
disabled. Separately, `workouts` gained a nullable `time` column
(`lib/db/schema/workouts.ts`) and a new `LogPastWorkoutForm`
(`components/health/log-past-workout-form.tsx`) — a collapsed-by-default "Log a past workout"
form on `/health` with date/time/duration/type fields, distinct from `QuickWorkoutLog`'s fast
2-tap "log now" path (ADR-095), which is unchanged. `POST /api/workouts` already accepted an
arbitrary `date` (used for webhook backfill); it now also accepts an optional `time`.

**Reason:** Direct user request/bug report — ADR-095 originally designed workout-linked
habits as auto-check-*instead of*-manual-toggle ("so it's not a button here at all, just a
static row reflecting derived state"), which meant a forgotten workout log made the habit
permanently uncheckable for that day with no recovery path, exactly the kind of unrecoverable
state ADR-091's design ("a forgotten check-in is a click away to fix rather than permanently
lost") was supposed to prevent everywhere else in Challenges. `toggleCompletion`
(`lib/challenges/service.ts`) already had no server-side guard at all — the block was purely
UI-side, so removing it required no service/API changes, only the disabled-state logic.
Workout backfill follows the same "forgot to log it" motivation: `lib/challenges/service.ts`
already matches workouts to habit-days by the workout's own `date` field (not when it was
logged), so a backdated workout correctly retroactively satisfies a past challenge day once
manual toggling isn't the only way to notice that.

### ADR-107: A LIVE favorite-team game surfaces to NOW

**Decision:** `lib/today/service.ts` now includes `"Live"`-status favorite-team games
alongside `"Preview"` ones in Today's candidate pipeline (previously Live games were filtered
out entirely before reaching the ranking engine). `SportsCandidateInput`/`RankedItem`
(`lib/today/ranking.ts`) gained a `live?: boolean` field; `importancePoints()`'s sports case
returns 70 (versus the standard 6) when `live` is true — high enough on its own to guarantee
crossing `NOW_THRESHOLD` (70) regardless of which side of the due_soon/overdue split
`urgencyPoints()` puts a live game on, which depends on exactly when "today" rolls over
relative to kickoff. `DueBadge` gained a `live` prop that renders a plain "LIVE" badge
(reusing the existing `overdue` red variant) instead of the normal date-based badge, since a
live game's kickoff time has already passed and the date math would otherwise misleadingly
read as "Today"/"Xd ago". The subtitle for a live game also upgrades from the plain sport name
to a live score line (e.g. "MLB · 4-2 · Top 7") once score data is available.

**Reason:** Direct user request — "if the Rockies are playing a game currently, let's surface
it." ADR-036/ADR-065 deliberately keep sports at TODAY-tier "even on game day" because a
*scheduled* game is context-independent nice-to-know, not an obligation — but ADR-065's own
framing ("the same domain can produce ambient information or an urgent one depending on
context... a Cubs game is TODAY, but 'user has tickets and must leave in 30 minutes' is NOW")
already anticipated exactly this kind of exception: a game transitioning from scheduled to
in-progress is a real context change, not just time passing. Scoped narrowly — only `live:
true` gets the importance bump; a merely-scheduled game today is unaffected and stays
TODAY-tier exactly as ADR-036 established. Not verified against real sports-betting data (no
live game / no favorite teams configured in this environment) — verified via a new unit test
(`lib/today/ranking.test.ts`) confirming the score crosses/stays under threshold correctly,
full type/build/lint checks, and a synthetic DOM injection matching the exact `NowList`/
`DueBadge` markup to confirm the "LIVE" badge and score subtitle render and read correctly in
context (screenshot-verified, light/dark not separately re-checked for this one).

### ADR-108: Immich images were fetched at "thumbnail" size everywhere, not just as thumbnails

**Bug report:** "the image quality on the Feed is pretty garbage." Also asked for smaller,
grid-arranged cards on desktop.

**Decision:** `ImmichClient.fetchThumbnail` (`lib/immich/client.ts`) requested Immich's
`size=thumbnail` (~250px, heavily compressed WebP) for every image, then displayed it at full
card width via CSS — visibly blurry/blocky once stretched, on both `/feed`'s Log tab
(`app/api/moments/[id]/image/route.ts`) and Grow's per-plant photo log
(`app/api/grow/[id]/photos/[photoId]/image/route.ts`), which share this one client method.
Renamed to `fetchPreview` and switched to `size=preview` (Immich's ~1440px JPEG) — still far
short of the original asset (fast, not the multi-MB source file), but sharp at real display
size. Separately, `components/moments/moments-list.tsx` changed from a single full-width
column (`max-h-96` images) to a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
xl:grid-cols-4`) with square-cropped smaller cards — single column stays on mobile (a photo
journal you scroll through), multi-column kicks in on desktop where a tall single column of
full-size photos wastes most of the screen's width. Sort order needed no change —
`listLogEntries` (`lib/moments/service.ts`) already queries `orderBy(desc(occurredAt))`.

**Reason:** The size mismatch was a real bug, not a quality/bandwidth trade-off anyone
intended — `size=thumbnail` exists for actual thumbnail-sized UI (a small square preview in a
list), not for the primary display image on a page whose whole purpose is showing the photo.
Not live-verified against real photos — this environment's Immich isn't connected (same
"Geoff needs to connect this himself" gap noted when Moments first shipped, ADR-096) — verified
via lint/typecheck/test/build and confirming the "not connected" fallback state still renders
correctly; the grid CSS itself matches the exact `grid-cols-1 sm:grid-cols-2 ...` responsive
pattern already used and visually confirmed elsewhere in the app (Notes, Lists, Pets grids).

## Landscape Visual Direction (ADR-109 through ADR-125)

The following were accepted as product direction on 2026-08-26, reconciling an earth/landscape
visual prototype (originally a Kotlin/Jetpack Compose design brief) against the calm-computing
direction above — [docs/LANDSCAPE_VISUAL_DIRECTION.md](docs/LANDSCAPE_VISUAL_DIRECTION.md) is
that reconciliation kept verbatim, including the full visual system spec (palette,
environmental model, per-screen design direction). What follows is the condensed version,
renumbered to continue this ledger (the source document numbers its own entries ADR-104
through ADR-120 — those collide with this file's existing ADR-104 through ADR-108, which are
unrelated backdrop-motion/dashboard-gradient/challenge/sports/Immich decisions).

The core reconciliation: keep the earth/landscape visual language (dark, warm, stone/clay/
copper materials, environmental time-of-day tinting), but explicitly reject everything
gamification-shaped that the original prototype also proposed — no Focus Score, no
streak-dot habit grids, no numeric Life Pulse, no decorative always-on dashboards. Several
entries below restate something already true of the running app (Life Pulse is already
semantic, not a score; Today is already the mobile nav anchor) rather than describing new
work — called out per entry, same as the calm-computing merge above. See ROADMAP.md for what
this doc merge actually triggered in the first implementation pass (visual foundation +
Today) versus what's deferred (an immersive Home screen, Health/Grow organic visualizations).

### ADR-109: LifeOS is a landscape, not a dashboard

**Decision:** The primary visual metaphor is a landscape of the user's life, not a
productivity dashboard — the visual system draws from earth, forest, mountains, stone, clay,
moss, and copper, kept subtle enough that LifeOS never reads as a nature/wellness app.
**Reason:** Gives the calm-computing philosophy a distinctive physical identity without
requiring the interface to surface more information to feel rich.

### ADR-110: Dark mode remains the primary visual foundation

**Decision:** LifeOS stays dark-mode-first. The base is warm near-black/deep-brown/dark-stone
with restrained moss/olive/clay/copper/warm-gold/parchment accents — not a conversion to a
light beige interface, and not pure black/white, neon green, or generic blue productivity UI.
**Reason:** Preserves the original ambient quality while the earth palette becomes the
product's visual identity.

### ADR-111: The environment changes; the interface remains familiar

**Decision:** Time of day (and eventually weather/season) may shift the environmental
presentation — dawn/morning/afternoon/golden-hour/dusk/night — without the underlying
interface changing dramatically. "The world changes. The interface stays familiar."
**Reason:** Extends the existing time-of-day gradient concept (ADR-105) into a fuller
environmental model. **Already partially true:** `lib/theme/time-of-day.ts` buckets the day
into four (not six) phases today; the full six-phase model is aspirational, not required.

### ADR-112: Home is the environmental overview

**Decision:** Home should be the most immersive LifeOS surface, following
`environment → Life Pulse → what needs you → Today → optional context`. It must not attempt
to display every domain/metric, and should stay sparse when nothing needs attention.
**Reason:** Applies ADR-039/043/044/070 to the visual redesign. **Not yet built:** the app has
no distinct Home nav destination today — the Today page's greeting/ambient-weather header
plays this role. A separate immersive Home screen is deferred, not part of the first
implementation pass.

### ADR-113: Life Pulse is the primary synthesis mechanism, not a score

**Decision:** Life Pulse stays a semantic attention state (`CALM`/`ACTIVE`/`ATTENTION`/
`URGENT`, e.g. "2 things need your attention") — never a numeric score like "82/100" or a
"performance" framing.
**Reason:** Sharpens the exploratory ADR-042 into a firm constraint. **Already true:**
`components/dashboard/life-pulse.tsx` already renders exactly this — no change needed.

### ADR-114: LifeOS may visualize progress without gamifying behavior

**Decision:** No streaks, XP, levels, badges, leaderboards, or engagement-maximizing
mechanics — but real progression (habit consistency, workout history, garden growth, health
trends) may still be visualized when useful. Describe reality ("11 of 14 days this month"),
don't judge it ("🔥 14 day streak! Don't break it!").
**Reason:** Progress can feel satisfying without manufacturing engagement pressure —
compatible with ADR-067's existing anti-gamification stance.

### ADR-115: Growth belongs in the Grow domain, not global attention

**Decision:** Progress-oriented visualizations belong in Grow/Health/historical views, not as
a persistent global score on Home. Life Pulse answers "what needs attention"; Grow answers
"what has developed over time" — the two must not merge.
**Reason:** Keeps attention and development conceptually and visually separate.

### ADR-116: Completion should make the interface quieter

**Decision:** Completing something resolves it, de-emphasizes it, and lets the surface get
quieter — never auto-backfills the freed space with the next-lowest-priority item to keep the
screen full.
**Reason:** Visual expression of ADR-044/072. **Already true:** `NowList`/`TodayGroups` already
show an explicit calm confirmation ("All done.") on empty rather than pulling in more items.

### ADR-117: Home and Today have different jobs

**Decision:** Home is ambient/synthesized/environmental ("what is the state of my life right
now?"); Today is focused/operational/actionable ("what matters today?"). Neither should
collapse into the other.
**Reason:** The two concepts complement rather than compete.

### ADR-118: Today remains the primary UX anchor

**Decision:** Today stays fixed at the geometric center of mobile nav with distinct visual
treatment — communicating "this is where I orient myself," not a gamified reward button.
**Reason:** Reinforces ADR-085 visually rather than changing it. **Already true:** the
center-nav-slot mechanics from ADR-085 are unchanged; this just constrains the *visual*
treatment of that slot going forward.

### ADR-119: The visual system should be material, not card-heavy

**Decision:** Surfaces should feel physical (stone, paper, clay, frosted glass) via subtle
tonal variation, soft shadows, and restrained translucency — not generic Material 3 cards,
excessive borders, glassmorphism, or decorative UI with no informational purpose.
**Reason:** "Physical rather than digital."

### ADR-120: Nature is an environmental language, not decoration

**Decision:** Nature elements (mountain silhouettes, moon/sun, clouds, atmospheric haze)
should communicate environment/time/context — not become literal botanical icons or
decorative illustrations sprinkled on every feature.
**Reason:** The user should feel "this feels alive," not "this is a nature-themed app."

### ADR-121: Ambient motion must remain subordinate to attention

**Decision:** Environmental motion (slow transitions, sun/moon movement, gentle parallax) is
fine; constant particle effects, competing animated backgrounds, and decorative motion with
no informational purpose are not.
**Reason:** Preserves the existing Motion Principles doctrine (ADR-074) rather than replacing
it. **Already true:** the app's one continuous-motion exception (rain/snow ambient weather,
ADR-104) already matches this — gated behind `motion-safe:`, nothing else loops.

### ADR-122: Color communicates attention, not domain ownership everywhere

**Decision:** Normal surfaces stay visually quiet; color intensity increases only as
relevance climbs the `KNOWN → AMBIENT → RELEVANT → ACTIONABLE → URGENT` ladder. No domain
should be permanently vivid.
**Reason:** Extends the restrained-color principle (ADR-073/090) with an explicit ladder-based
justification for *when* color is allowed to intensify.

### ADR-123: Raw counts are not the primary Home language

**Decision:** Home should prefer semantic summaries ("2 things need attention") over raw
counter grids ("17 Tasks / 14 Games / 6 Habits"). Counts remain fine inside detailed domain
views.
**Reason:** Applies ADR-043 more consistently to the redesigned Home specifically.

### ADR-124: Progressive disclosure remains a core visual rule

**Decision:** First presentation of an item shows only enough to understand its significance
(e.g. "Milo · Vet · 2:30 PM · Leave in 42 min"); full detail stays one tap away. The new
visual richness must not become an excuse for information density.
**Reason:** Beauty and calm should coexist with progressive disclosure — retained, not
changed, by the visual redesign.

### ADR-125: The interface is a selective lens, not a mirror

**Decision:** LifeOS may know far more than it displays. The design question for every
candidate item is "does this deserve attention here, right now?" — never "can we display
this?"
**Reason:** ADR-070 applied as an explicit design-review rule for the visual redesign.

## Updated product mental model

LifeOS has four primary user-facing layers — **NOW** (what requires my attention?), **TODAY**
(what is relevant to the current day?), **FEED** (what is new or interesting in my broader
world?), and **EVERYTHING** (all underlying personal data, domains, history, and settings) —
plus one universal interaction layer, **Ask LifeOS**, to query, understand, summarize, and act
across all four.

Central product principle: LifeOS should not maximize how much information it can display. It
should minimize how much information the user must personally process — and per the 2026-08-12
calm-computing direction above, the more precise goal is even sharper: **LifeOS exists so the
user can confidently disengage**, not to keep them engaged. Success looks like sessions that
end in "you're caught up," not sessions that run long.

The desktop application organizes the user's life. The mobile application prioritizes the
user's life. The Feed compresses the user's outside world. The agent lets the user interrogate
and act on all of it. A future Ambient Display keeps the household peripherally aware without
demanding interaction (ADR-057/058).

**Core mantra:** Know broadly. Surface selectively. Explain clearly. Act safely. Return to
calm.
