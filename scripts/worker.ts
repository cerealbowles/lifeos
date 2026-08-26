import "dotenv/config";
import { JOBS } from "@/lib/jobs/registry";

/**
 * DECISIONS.md ADR-088 — the background job runner. Long-running Node process (not a
 * one-shot script like migrate.ts/seed.ts), meant to run as its own `worker` service in
 * docker-compose.yml. Each job from lib/jobs/registry.ts runs once immediately on startup,
 * then again on its own interval — no shared scheduler tick, since the domains have
 * different TTLs (weather/sports/feed 30 min, calendar 15 min).
 *
 * Deliberately no job-lock/run-history table — this is a single dedicated process (no
 * horizontal scaling of `worker` is expected for a self-hosted personal app), so an
 * in-memory "already running" guard per job is enough to prevent a slow run overlapping
 * with its own next tick. Observability is stdout only (`docker compose logs worker`),
 * matching the app's existing lightweight-by-default approach — add a real history table
 * later if debugging actually needs it.
 */

const running = new Set<string>();

async function runJob(job: (typeof JOBS)[number]) {
  if (running.has(job.name)) {
    console.log(`[worker] ${job.name}: skipped tick — previous run still in progress`);
    return;
  }

  running.add(job.name);
  const startedAt = Date.now();
  try {
    const result = await job.run(new Date());
    const ms = Date.now() - startedAt;
    console.log(`[worker] ${job.name}: refreshed=${result.refreshed} failed=${result.failed} (${ms}ms)`);
  } catch (err) {
    console.error(`[worker] ${job.name}: run threw`, err);
  } finally {
    running.delete(job.name);
  }
}

console.log(`[worker] starting ${JOBS.length} job(s): ${JOBS.map((j) => j.name).join(", ")}`);

const timers = JOBS.map((job) => {
  // Fire once immediately so a freshly (re)started worker doesn't wait a full interval
  // before the first sync — useful after a deploy/restart, not just for the ongoing cadence.
  void runJob(job);
  return setInterval(() => void runJob(job), job.intervalMs);
});

function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down`);
  timers.forEach(clearInterval);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
