# Data Model

Source of truth: `lib/db/schema/*.ts` (Drizzle table definitions), migrated via
`npm run db:generate` / `npm run db:migrate`. This doc is a map, not a mirror — read the
schema files for exact column types/constraints.

Every table has `user_id` (even though the app is single-user today) so multi-user is
additive later, per DECISIONS.md ADR-012. All timestamps are stored in UTC and converted to
the user's timezone at the application boundary (`lib/format.ts`, `date-fns-tz`).

## users.ts

- **users** — `email`, `password_hash`, `display_name`, `timezone`, `units_system`,
  `feed_last_viewed_at` (nullable — a single per-user cursor for Feed's "you're caught up"
  closure state, DECISIONS.md ADR-052; not per-item read/saved tracking, see `feed.ts` below).
  `bottom_nav_items` (nullable JSONB, exactly 4 slots when set —
  `[leftOuter, leftInner, rightInner, rightOuter]`, each a page href or `null`) configures the
  mobile bottom nav's positions around the fixed-center Today tab; null means "never
  configured," and `lib/nav.ts`'s `DEFAULT_BOTTOM_NAV_ITEMS` fills in — see DECISIONS.md
  ADR-085.
- **sessions** — `user_id`, `token_hash` (SHA-256 of the cookie value, not the raw token),
  `expires_at`. See DECISIONS.md ADR-012 for why this isn't a JWT.

## tasks.ts

- **tasks** — one-off work items. `status` (`todo` / `in_progress` / `done` / `skipped` /
  `cancelled`), `priority`, `due_at`, `category` (free text, not a foreign key — see below).
- **routines** — recurring work. `recurrence_type` + `recurrence_config` (JSONB, discriminated
  by type: `interval` / `weekly` / `monthly_day` — see `RecurrenceConfig` in this file and
  `lib/tasks/recurrence.ts` for the math), `next_due_at` (denormalized, recomputed on every
  complete/skip).
- **routine_events** — completion/skip history per routine. This is what a future "8 of 9
  routines completed this week" weekly review (spec §73) would query.

`tasks.category` and `routines.category` are plain text, not a `categories` table — the spec's
conceptual schema left this open ("exact names can evolve"). Revisited for `tasks.category`
specifically once real filter-chip UI needed it (DECISIONS.md ADR-093): validated at the API
boundary against a fixed set (`lib/db/schema/tasks.ts`'s `TASK_CATEGORIES` — `Home`/`Car`/
`Yard`/`Chores`/`Kids`), but the column itself is still plain text, not a DB enum, so growing
the set later is a code change, not a migration. `routines.category` remains fully open —
nothing has needed it yet.

## lists.ts

- **lists** — `name`, `list_type`, `archived`. Rename and delete both work at `/lists/[id]`
  now; "delete" is a soft delete (`archived = true`, filtered out of `listLists`) rather than
  a real `DELETE` — `list_items.list_id` has `onDelete: cascade`, so a hard delete would
  destroy every item ever added to the list. Same reasoning and same fix as pets' `active`
  flag — see DECISIONS.md ADR-081.
- **list_items** — `name`, `quantity`, `unit`, `checked`/`checked_at`, `position` (manual
  ordering, not yet exposed in the UI — items currently sort unchecked-first then by
  position/creation).

## activity.ts

- **activity_events** — append-only cross-domain timeline. Every mutation in
  `lib/<domain>/service.ts` writes one row here (`domain`, `event_type`, `entity_type`,
  `entity_id`, `summary`). This is what "when did I last clean the bathroom" (spec §60,
  Example 4) will eventually query, and what feeds the future habit-learning engine (spec
  §28).

## pets.ts

- **pets** — `name`, `species`, `breed`, `birth_date`, `weight`, `active`. Full CRUD at
  `/pets`/`/pets/[id]`, including profile edit. "Delete" is called **Retire** in the UI and
  is a soft delete (`active = false`) rather than a real `DELETE` — `pet_events.pet_id` has
  `onDelete: cascade`, so a hard delete would destroy the pet's entire event history along
  with it. The `active` column existed in the schema from the start for exactly this; the
  original `deletePet` just didn't use it until a delete button actually existed in the UI to
  call it (DECISIONS.md ADR-081/082). Two different reads of "active" depending on caller:
  `listPets()` (active-only — used by the AI agent and Today's candidate generation, since a
  retired pet shouldn't generate future obligations) vs. `listAllPets()` (active + retired,
  sorted active-first — used by the `/pets` grid, which shows retired pets too, marked with a
  "Retired" badge and a restore button, per explicit request: "always see them in the pets
  pane regardless of living status"). `birth_date` also drives a derived (not stored) next-
  birthday computation — see `lib/pets/birthday.ts` and ADR-082 — surfaced on the pet's own
  page and in Today, elevated into NOW only on the day itself/the day before.
- **pet_events** — `event_type` (`vet_appointment` / `medication` / `vaccination` /
  `grooming` / `weight` / `feeding` / `purchase` / `other`), `scheduled_at`, `completed_at`,
  `recurrence_rule` (same `RecurrenceConfig` shape as `routines.recurrence_config` — reused
  via `lib/tasks/recurrence.ts`, not reimplemented). Managed per-pet at `/pets/[id]`;
  completing a recurring event inserts the next instance rather than mutating a "next due"
  field, since each row is its own occurrence (unlike routines, which are one row with a
  moving `next_due_at`).

## measurements.ts

- **measurements** — generic manual measurements (`type`, `value`, `unit`, `measured_at`).
  `type` is plain text, not an enum (matches `tasks.category`'s open-ended reasoning) — only
  `"weight"` has real UI today (`/health`'s `WeightCard`: an entry form, a line chart with a
  `30d`/`90d`/`6m`/`12m`/`all` range toggle, and a recent-entries log with delete —
  DECISIONS.md ADR-092), but nothing in the schema or service layer
  (`lib/measurements/service.ts`) is weight-specific, so a future type (blood pressure, sleep,
  etc.) needs no migration, just UI. `unit` is derived from `users.units_system` at entry
  time (`lb`/`kg`), not user-chosen per entry.

## activities.ts

- **activity_sessions** — a running or completed timed activity (`activity_type` free text,
  not a Postgres enum — same open-ended reasoning as `tasks.category`; `stretching` is the
  only value used today). `started_at`/`ended_at` (not a single duration) is the source of
  truth specifically so the ambient timer (`/ambient/activity/[id]`) can recompute elapsed
  time from `started_at` on every render — a page reload mid-session doesn't lose the timer.
  `duration_seconds` is denormalized on completion for the Health page's log. A completed
  session is never written into `measurements` — deliberately a single source of truth per
  concept, not a synced duplicate (DECISIONS.md ADR-087, same instinct as pet birthdays not
  being copied into `pet_events`). Deletable in any state (completed or abandoned) — unlike
  pets/lists, there's no soft-delete-to-preserve-history concern, nothing else references this
  table.

## finance.ts

- **financial_accounts** — `name`, `account_type`, `institution`, `last_four`,
  `statement_close_day` / `next_statement_close_at` (nullable — not every account has a
  billing cycle; added beyond the original spec so paying down a balance before the
  statement generates is trackable, distinct from the payment due date).
- **financial_reminders** — `due_rule` (JSONB, currently just `{ type: "monthly_day", day }`),
  `next_due_at` (denormalized), `autopay`. Full CRUD at `/money`. Deliberately
  obligation-tracking only — no transaction-level banking (spec §16, DECISIONS.md ADR-006).

Both `next_due_at` and `next_statement_close_at` are lazily refreshed on read
(`lib/finance/service.ts`) rather than requiring an explicit "complete" action or a
background job — bills and statement cycles roll forward on their own schedule regardless
of what the user does, unlike tasks/routines.

## weather.ts

- **weather_settings** — one row per user: `provider` (currently only `openweathermap`),
  `api_key_encrypted` (AES-256-GCM via `lib/security/crypto.ts`, key derived from the
  `APP_ENCRYPTION_KEY` env var — never stored or logged in plaintext, never sent back to the
  client once saved).
- **weather_locations** — geocoded from a postal code on connect (`lib/weather/provider.ts`).
  `is_primary` exists for future multi-location support; only one location is managed today.
- **weather_snapshots** — cached provider responses (`lib/weather/service.ts` fetches when the
  latest snapshot is older than 30 min, per spec §12 — either lazily on page read, or
  proactively via the `worker` service, DECISIONS.md ADR-088). Includes `high_today` /
  `low_today` / `precipitation_chance` / `precipitation_amount`, aggregated from OpenWeatherMap's
  3-hour forecast blocks over the next ~24h. This table is also the foundation for actual
  rainfall-history accumulation (spec §12/§13) — snapshots now accumulate on a schedule
  regardless of page views, but the rainfall-history/garden-zone feature itself, built on top
  of that history, still isn't implemented.

## calendar.ts

- **calendar_accounts** — one row per user today (`connectCalendar` deletes any existing
  row before inserting — single active calendar source, matching weather_settings' shape).
  `provider` (`"icloud"` only so far), `caldav_username` (Apple ID email, plaintext — it's
  not a secret), `credential_encrypted` (app-specific password, same AES-256-GCM pattern as
  weather's API key), `last_synced_at` drives the lazy-sync TTL.
- **calendar_events** — `external_id` is the CalDAV event UID; `unique(calendar_account_id,
  external_id)` is the upsert target for sync (`ON CONFLICT DO UPDATE`), so re-syncing never
  duplicates. `calendar_account_id`/`external_id` are both nullable for manually-created
  events (`source: "manual"`), which work with or without a connected account — spec §63 M5
  explicitly scopes "manual calendar events" alongside the sync integration, not as a
  fallback for when sync isn't set up.

## sports.ts

- **favorite_teams** — per-user. DECISIONS.md ADR-099 replaced the old ESPN-id shape
  (`sport_path`/`league_path`/`team_external_id`) with a plain `(sport, team_abbr)` pair —
  `sport` is `"mlb"` | `"nfl"` (plain text, not a Postgres enum, same open-ended reasoning as
  `tasks.category`), `team_abbr` a standard abbreviation ("NYY", "KC") from the static list in
  `lib/sports/teams.ts`. `team_name` is denormalized at follow-time for display.
  `unique(user_id, sport, team_abbr)` prevents following the same team twice. **No
  `sports_events` table anymore** — game data isn't stored in LifeOS's own database at all;
  every read calls sports-betting live (`lib/sports/betting-client.ts`, a separate self-hosted
  app), which already runs its own short-TTL cache. No `last_synced_at` either — favorites are
  now just a static preference, nothing to sync per-team.

## feed.ts

- **feed_subscriptions** — per-user. `feed_url` is the subscription key (RSS has no stable
  numeric id — it's what the user actually pastes in). `title`/`site_url` are captured from
  the feed itself at subscribe time via `lib/feed/provider.ts` (`rss-parser`), not typed in
  by hand. `unique(user_id, feed_url)` prevents double-subscribing. `last_synced_at` drives
  the lazy-sync TTL, same pattern as `weather_settings`/`calendar_accounts`/`favorite_teams`.
- **feed_items** — **not** user-scoped: one shared cache, since the same article is the same
  row no matter which user(s) subscribe to that feed.
  `unique(feed_url, guid)` is the upsert target; `guid` falls back to the item's link (and
  then title) when a feed omits one, since not every feed sets it. No per-item `read_at`/
  `saved_at` yet — the conceptual FeedItem shape in DECISIONS.md ADR-025 includes them, but
  they'd need a separate per-user join table (`feed_url`+`guid` isn't a per-user row). What
  *does* exist now is coarser: `users.feed_last_viewed_at` (see `users.ts` above) is a single
  cursor, not per-item state — enough for ADR-052's "you're caught up" framing (new-since-
  last-visit vs. already-seen, computed in `lib/feed/service.ts`'s `getFeedCatchUp()`), not
  enough for an actual read/unread inbox where individual items can be marked read out of
  order. Add the per-item table if/when the UI needs that finer granularity.

## challenges.ts

- **challenges** — a bounded-duration, multi-habit program (the "75 Hard" shape): `name`,
  `start_date`, `duration_days`, `status` (`active`/`completed`/`abandoned`, plain text not an
  enum — same open-ended reasoning as `tasks.category`). Distinct from `routines`
  (`tasks.ts`), which are indefinitely recurring single tasks with no bounded end or "day N of
  D" concept. "Day N" is never stored — computed fresh from `start_date` on every read
  (`lib/challenges/day.ts`), same reasoning as pet birthdays (ADR-082).
- **challenge_habits** — the fixed set of things tracked daily within one challenge, defined
  once at creation (`title`, `position`). Editable afterward via `/challenges/[id]`, but the
  expected shape is "define the rules once, then follow them," not an ever-changing checklist.
- **challenge_completions** — one row per (habit, calendar day) marked done — the actual
  journal entries. `date` is a plain Postgres `date` (no time component, same as
  `pets.birth_date`), computed in the user's timezone at the application boundary.
  `unique(habit_id, date)` makes the checkbox a toggle (insert to mark done, delete to
  un-mark) rather than an accumulating log of repeated check-ins. `challenge_id` is
  denormalized off `habit_id` purely so "all completions for this challenge" doesn't need a
  join on every read — same convention as `pet_events.user_id` being denormalized off `pet_id`.
  Deletable in any state; unlike pets/lists (ADR-081), there's no soft-delete-to-preserve-
  history concern — a challenge's history has no reference or value outside that challenge.

## growing.ts

- **grow_plants** — `strain`, `stage` (`seedling`/`veg`/`flower`/`flush`/`harvest`, plain text
  not an enum), `date_planted`, `trichome_status` (`clear`/`cloudy`/`amber`, nullable — only
  meaningful once flowering), `last_checked_at`, `active` (soft "retired," same reasoning as
  `pets.active` — a harvested plant's history is worth keeping, ADR-081/082/094).
  `active`/`listPlants()` feeds Today's check reminders directly into the ranking engine as a
  `"grow"` `CandidateDomain` (`lib/today/ranking.ts`) — unlike Challenges/Activity sessions,
  there's no separate always-visible card for this domain; it renders through the same
  `TodayGroupCard` every other domain (Routines, Pets, etc.) uses. "Day N" and "next check
  due" are both computed fresh from `date_planted`/`last_checked_at` on every read
  (`lib/growing/day.ts`), never stored. `immich_album_id` (nullable text, ADR-097) — a
  plant-specific Immich album, set via `lib/immich/album-url.ts`'s `parseImmichAlbumId`
  (accepts a bare id or a pasted share URL).
- **grow_plant_photos** (ADR-097) — one row per uploaded photo: `plant_id`, `user_id`
  (denormalized alongside `plant_id`, same convention as `pet_events`), `immich_asset_id`
  (reference only, same "no photo bytes stored" shape as `log_entries`), `caption`,
  `taken_at`. Uploaded through the one shared per-user Immich connection
  (`immich_settings`/ADR-096) but linked into *this plant's own* album, not the global
  Moments album — every plant can have a separate Immich folder.

## workouts.ts

- **workouts** — `date`, `type` (free text — `lifting`/`run`/`walk`/`golf` have quick-log
  buttons, anything else is still a valid manual/webhook value), `duration_minutes`,
  `outdoor`, `note`, `source` (`"session"` or `"webhook"` — which auth path actually created
  the row, see `lib/auth/webhook.ts`, ADR-095). No ranking-engine integration — unlike Grow,
  this is a log of past events, not upcoming due-date items, so it has no Today presence of
  its own. Consumed two ways: displayed on `/health`'s Workouts card, and read by
  `lib/challenges/workout-match.ts` to auto-check any Challenge habit whose title mentions
  "workout" (a title heuristic, not a foreign key — see ADR-095).

## immich.ts

- **immich_settings** — one row per user: `instance_url`, `api_key_encrypted`, `album_id`.
  Same shape and rationale as `weather_settings` (ADR-096): validated against the real Immich
  instance before saving, encrypted at rest via `lib/security/crypto.ts`, entered only through
  Settings' own form — never written by the app/an agent directly, including from a value
  supplied in chat (see ADR-096's credential-handling note).

## log.ts

- **log_entries** — "Moments" (ADR-096): `immich_asset_id` (reference only — the photo itself
  lives in Immich, LifeOS never stores or duplicates image bytes), `caption`, `location`,
  `occurred_at`. `user_id` is the doc's spec'd `author_id`, same column every other table
  already uses for "hardcode to Geoff, structure for multi-user later." No soft-delete —
  deleting a Moment here just removes the reference; the underlying Immich asset is untouched.

## notes.ts

- **notes** — `title`, `body` (both plain text, no markdown rendering), `pinned`, `archived`.
  Plain manual CRUD, no AI summarization — the scope ROADMAP.md picked for this domain.
  Delete is soft (`archived = true`, filtered out of `listNotes`), same pattern as lists/pets.
  `pinned` notes sort first in the list; otherwise sorted by `updated_at` descending. Not
  wired into Today's NOW/TODAY ranking — notes have no inherent urgency/date, same reasoning
  Feed's RSS items stay off Today.

## notifications.ts

- **notifications** — spec §34's shape (`type`, `title`, `body`, `sent_at`, `read_at`,
  `metadata`), plus `category` (`immediate`/`time_sensitive`/`digest`/`silent`, docs/
  CALM_COMPUTING_DECISIONS.md's Notification Philosophy) and `entity_type`/`entity_id`
  pointing back at the source record. Only `immediate`/`time_sensitive` trigger an actual Web
  Push (`lib/notifications/push.ts`) — `digest`/`silent` are written for the in-app list only
  (`NotificationBell`). Generated by the `notifications` background job
  (`lib/notifications/job.ts`, in `lib/jobs/registry.ts`): every 10 minutes, re-derives each
  user's NOW tier via the existing `getTodayOverview`/ranking pipeline and creates one
  notification per NOW item not already notified in the last 24h
  (`hasRecentNotification`'s dedupe window) — CLAUDE.md's "avoid resurfacing... recently
  surfaced." `scheduled_for` from the spec's schema isn't used yet — nothing currently
  schedules a future notification, only reacts to current NOW state.
- **push_subscriptions** — one row per browser/device Web Push subscription (`endpoint`,
  `p256dh`, `auth`), enabled from Settings. App-wide VAPID keys live in env vars
  (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`), not per-user encrypted secrets
  like weather/calendar — they identify this LifeOS server to push services, not a
  third-party account. A subscription the push service reports as gone (410/404) is pruned
  automatically on next send attempt.

## agent.ts

- **agent_conversations** — `title` is auto-set from the first user message (truncated).
- **agent_messages** — full conversation log, including intermediate tool-call/tool-result
  rows. Only `role in (user, assistant)` messages with non-empty content are replayed back
  into the model on a new turn (`lib/agent/service.ts` `listVisibleMessages`) — the
  tool-call scaffolding from past turns isn't resent, it's just there for a complete
  record. `model_provider`/`model_name`/`token_usage` columns exist but aren't populated
  yet (Ollama's response doesn't map cleanly to them in the current adapter).
- **agent_actions** — one row per tool execution, per spec §25. `required_confirmation` /
  `confirmed_at` exist now but are always `false`/`null` in Milestone 7, since every tool is
  `permissionLevel: "read"` (auto-allowed, spec §24 Level 1) — they start earning real values
  once Milestone 8 adds write tools.

## Not modeled yet

Added when their milestone actually starts, so the shape is driven by a real UI rather than
guessed in advance:

- `garden_zones` (gardening logic beyond the simple forecast-based hint on Today)
- `personal_facts`, `semantic_memories` (Milestone 9)
- Feed item read/saved state (`feed_items` exists; per-user read/unread tracking doesn't — see `feed.ts` above)
