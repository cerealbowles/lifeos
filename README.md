# LifeOS

A self-hosted personal-life operating system: one place for today's schedule, household
routines, shopping lists, pet care, and (eventually) an AI assistant that reasons over your
own data.

- [PRODUCT.md](PRODUCT.md) — what LifeOS is, the NOW/TODAY/FEED/EVERYTHING model, non-goals
- [ARCHITECTURE.md](ARCHITECTURE.md) — layers and structure
- [DECISIONS.md](DECISIONS.md) — numbered ADR log
- [UX_PRIORITIZATION.md](UX_PRIORITIZATION.md) — the Today ranking/suppression algorithm
- [DATA_MODEL.md](DATA_MODEL.md) — schema as built
- [ROADMAP.md](ROADMAP.md) — milestone status
- [docs/LIFEOS_PRODUCT_ENGINEERING_SPEC.md](docs/LIFEOS_PRODUCT_ENGINEERING_SPEC.md) — original full spec
- [docs/CALM_COMPUTING_DECISIONS.md](docs/CALM_COMPUTING_DECISIONS.md) — the calm-computing/
  adaptive-UI attention-design direction (accepted 2026-08-12), full illustrated version

**Status:** Milestones 0–7 plus 7.5, 10, 11, and 13 are done (Foundation, Tasks + Lists,
Today ranking, Weather, Pets, Calendar, Money, AI Foundation, Sports, PWA, Feed, Life Pulse)
— a Today view driven by a ranking/suppression engine and a calm-computing pass (restrained
color, motion, a Life Pulse attention readout), real weather/pet/iCloud-calendar/financial/
sports data, a working local AI assistant at `/ask` (read-only tools, Ollama by default), an
RSS Feed at `/feed` kept deliberately separate from Today's NOW/TODAY tiers, and an
installable PWA shell. See [ROADMAP.md](ROADMAP.md) for what's next.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL · Drizzle ORM · TanStack Query

## Prerequisites

- Node.js 24+ (see `.nvmrc`)
- Docker + Docker Compose (for Postgres, and for the production container)

## Development

```bash
# 1. Copy env vars and adjust as needed (defaults work with docker-compose as-is)
cp .env.example .env

# 2. Start Postgres
docker compose up -d postgres

# 3. Install dependencies
npm install

# 4. Run migrations
npm run db:migrate

# 5. Seed realistic dev data (creates alex@example.com / lifeos-dev)
npm run db:seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first run with no seed data, the
`/login` page becomes a one-time account setup form instead of a login form.

### AI (`/ask`)

```bash
docker compose --profile ai-local up -d ollama
docker compose exec ollama ollama pull llama3.2:3b   # ~2GB, needs to support tool calling
```

`AI_BASE_URL` in `.env` should point at wherever Ollama is actually reachable —
`http://localhost:11434` when running Next.js on the host against a Docker-mapped Ollama
port (the default dev setup above), `http://ollama:11434` when `web` itself runs inside
docker-compose (see `.env.example`'s note on Docker service names). CPU-only inference is
slow (20–60s per response observed) — a GPU or a bigger/faster model will help, or point
`AI_PROVIDER`/`AI_BASE_URL`/`AI_MODEL` at an OpenAI-compatible endpoint once that adapter
exists (see ROADMAP.md).

## Commands

```bash
npm run dev          # start the dev server
npm run build         # production build
npm run start         # run the production build

npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test               # vitest

npm run db:generate    # generate a new Drizzle migration from schema changes
npm run db:migrate     # apply migrations
npm run db:seed        # (re)seed development data
npm run db:studio      # Drizzle Studio, a GUI over the database
```

## Deployment

```bash
docker compose up -d
```

Brings up Postgres, runs pending Drizzle migrations (the `migrate` service — a one-off
container that exits after applying them; safe to run on every `up`, already-applied
migrations are skipped), then starts `web` (built from the included `Dockerfile`, a
standalone Next.js production build). `web` won't start until `migrate` finishes
successfully. Add `--profile ai-local` to also start a local Ollama service once the AI
runtime (Milestone 7) lands.

Set real values in `.env` before deploying — at minimum `POSTGRES_PASSWORD`,
`SESSION_SECRET`, and `APP_ENCRYPTION_KEY` (`openssl rand -base64 32` for each of the
latter two). `APP_ENCRYPTION_KEY` encrypts third-party API keys (e.g. weather) at rest —
back it up, since losing it makes saved keys undecryptable and they'll need to be
re-entered from Settings.

## Project layout

```text
app/(auth)/       login + first-run account setup (Server Actions)
app/(dashboard)/  authenticated pages: Today, Calendar, Tasks (route: /home), Lists, ...
app/api/          REST-ish JSON API (also the future surface for AI tools)
lib/db/schema/    Drizzle table definitions, one file per domain
lib/<domain>/     service functions (business logic), kept out of components
components/       ui/ (primitives), layout/, dashboard/, tasks/, lists/
scripts/seed.ts   development seed data
drizzle/          generated SQL migrations
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the reasoning behind this layout.
