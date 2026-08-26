# Architecture

LifeOS is a modular monolith: one Next.js app, one Postgres database, domain logic organized
by folder rather than by service. See [PRODUCT.md](PRODUCT.md) for what the product is and
[DECISIONS.md](DECISIONS.md) for the numbered ADR log — this doc covers layers and structure
only, not the reasoning behind each choice.

## Layers

```text
app/(dashboard)/*        Server Components render pages using service functions directly
app/api/*                Route Handlers: the same service functions, exposed as JSON
components/*/*.tsx        Client Components (TanStack Query) for interactive pieces
lib/<domain>/service.ts   business logic + activity logging, imports "server-only"
lib/db/schema/*.ts        Drizzle table definitions
```

Pages call service functions directly during server-side render (no self-fetch over HTTP).
The `/api/*` routes exist as a stable, authenticated JSON surface for client-side
interactivity (TanStack Query). Agent tools (`lib/agent/tools.ts`) follow the same pattern
one level further in: they call `lib/<domain>/service.ts` functions directly too, not the
HTTP routes — same principle as the routes (no direct DB access for the model), one fewer
hop.

## Known environment quirks (this dev box, not the app)

- The sandbox this was built in has no system Node.js or Docker Compose plugin preinstalled.
  Both were installed user-locally (nvm, and a Compose CLI plugin under `~/.docker/cli-plugins`)
  rather than via `sudo apt install`, since passwordless sudo wasn't available. A normal
  self-hosted server should just install Docker + Compose normally.
- `drizzle-kit`'s bundled `esbuild` has a moderate, dev-server-only advisory
  (GHSA-67mh-4wv8-2f99). It's a transitive dev dependency of the migration CLI, not something
  the running app serves; fixing it requires downgrading `drizzle-kit` to a much older major
  version, which isn't worth it for a personal dev tool. Revisit when drizzle-kit ships a
  patched esbuild.
- Turbopack's dev server (the Next.js 16 default) spawns a pooled Node.js worker process to
  evaluate the Tailwind PostCSS transform, and does so using a bare `node` lookup that can
  fail in environments where `node` isn't on the default `PATH` `node` resolves through the
  Turbopack pool. If you hit `spawning node pooled process — No such file or directory`,
  run `next dev --webpack` instead, or make sure `node` is discoverable outside the shell
  you launch things from (e.g. a symlink under `/usr/local/bin`).

## Data model

See [DATA_MODEL.md](DATA_MODEL.md) for the schema as built, and `lib/db/schema/*.ts` for
the source of truth.

## Today / ranking

`/` is not a fixed dashboard — it renders a ranked, suppressed set of items per
[UX_PRIORITIZATION.md](UX_PRIORITIZATION.md). `lib/today/ranking.ts` scores candidates and
buckets them into NOW / TODAY; `lib/today/service.ts` gathers the raw candidates from each
domain and calls into it. Domains with nothing relevant today render no card at all — see
DECISIONS.md ADR-011.

## External integrations

Weather (`lib/weather/`), Calendar (`lib/calendar/`), and Feed (`lib/feed/`) all follow the
same shape: a provider-neutral interface/class wrapping one external API (OpenWeatherMap,
iCloud CalDAV, `rss-parser` for RSS/Atom respectively), a `service.ts` that lazy-syncs on read
(check `last_synced_at`, re-fetch if stale — there's no background job runner yet, see
DECISIONS.md ADR-030) rather than polling on a schedule, and a Settings form to connect/
configure. Secrets (weather API key, iCloud app-specific password) are encrypted at rest via
`lib/security/crypto.ts`; RSS needs no key. Feed additionally caches fetched data
(`feed_items`) in a shared, non-user-scoped table rather than per-user, since the same
article is identical regardless of who's subscribed — see DATA_MODEL.md.

Sports (`lib/sports/`) is the one exception to that shape (DECISIONS.md ADR-099): it stores no
game data in LifeOS's own database at all, not even a cache. `lib/sports/betting-client.ts`
calls a small read-only endpoint on sports-betting — a separate self-hosted app on the same
machine — live on every read; sports-betting already runs its own short-TTL cache, so LifeOS
doesn't need a second one. Configured via env vars (`SPORTS_BETTING_URL`/
`SPORTS_BETTING_TOKEN`), not a per-user Settings form — this is deployment-level config
connecting two of the user's own self-hosted apps, not a personal third-party API key.
`favorite_teams` (per-user, which teams to elevate) is the only thing Sports still persists.

Feed is the one exception to "wire it into Today": its items deliberately do **not** become
`lib/today/ranking.ts` candidates. `/feed` is its own page — see DECISIONS.md ADR-038 for
why RSS/interest content stays out of the NOW/TODAY tiers by design.

## AI agent

`lib/agent/providers/` is the `ModelProvider` abstraction (DECISIONS.md ADR-004) — currently
one adapter, Ollama. `lib/agent/tools.ts` is the read-only tool registry (ADR-005); every
tool handler returns a lean, hand-picked shape rather than a raw service/DB result (ADR-035
— this isn't optional polish, a small local model reliably failed to synthesize an answer
from noisy raw-row tool output). `lib/agent/agent.ts` runs the tool-call loop (capped at 8
iterations, spec §21) and logs every tool execution to `agent_actions` regardless of
outcome. Conversation state lives in `agent_conversations`/`agent_messages`, not the
provider — `lib/agent/service.ts`'s `listVisibleMessages` replays only clean user/assistant
Q&A pairs back into the model on a new turn, not the intermediate tool-call scaffolding.
