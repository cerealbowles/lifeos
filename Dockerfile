FROM node:24-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Runs `npm run db:migrate` against a running Postgres before `web` starts (see the
# `migrate` service in docker-compose.yml). Needs tsx + drizzle-orm from full node_modules —
# the `runner` stage below only has Next's pruned standalone output, which doesn't include
# devDependencies like tsx, so migrations can't run there.
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY drizzle ./drizzle
COPY drizzle.config.ts ./drizzle.config.ts
COPY lib/db ./lib/db
CMD ["npx", "tsx", "lib/db/migrate.ts"]

# Long-running background sync process (see the `worker` service in docker-compose.yml,
# DECISIONS.md ADR-088) — proactively refreshes weather/calendar/sports/feed instead of only
# lazily syncing on page load. Same shape as `migrator` above (full node_modules, since it
# needs tsx/dotenv, not the pruned `runner` output) but copies all of `lib/` wholesale rather
# than one subdirectory — the job registry pulls in lib/weather, lib/calendar, lib/sports,
# lib/feed, lib/security, lib/db, etc., and enumerating each one individually here would be a
# silent trap the next time a job's dependencies change.
FROM base AS worker
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json tsconfig.worker.json ./
COPY lib ./lib
COPY scripts/worker.ts ./scripts/worker.ts
# tsconfig.worker.json's "server-only" path alias points here — same stub Vitest uses
# (test/server-only-stub.ts), so this one file is the only thing needed from test/.
COPY test/server-only-stub.ts ./test/server-only-stub.ts
# Invokes the tsx binary directly, not `npx tsx` — verified live that `npx` doesn't reliably
# forward SIGTERM to its child, so `docker stop`/`docker compose down` would SIGKILL this
# after a 10s grace period instead of hitting scripts/worker.ts's own shutdown handler. With
# node_modules/.bin/tsx as PID 1, the signal reaches the actual Node process directly.
CMD ["node_modules/.bin/tsx", "--tsconfig", "tsconfig.worker.json", "scripts/worker.ts"]

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
