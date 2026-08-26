"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * DECISIONS.md ADR-087. Elapsed time is recomputed from `startedAt` (server truth) every
 * tick rather than incremented locally — the same session id can be reopened after a reload
 * or the tab being backgrounded for a while, and the timer needs to reflect the real elapsed
 * time in both cases, not restart from 0 or drift from throttled setInterval ticks.
 *
 * Plain fetch + local state, not useMutation — the /ambient route group has no
 * QueryClientProvider (only app/(dashboard)/layout.tsx mounts one) and this page has no
 * cached query data to invalidate anyway, so pulling React Query in here would mean either
 * wrapping the whole ambient layout in a provider it otherwise doesn't need, or reaching for
 * a tool that doesn't fit. A real bug caught live: this originally used useMutation and threw
 * "No QueryClient set" the moment Done/Cancel was clicked.
 *
 * "Notifications silenced" from the original request isn't literal — there's no push
 * notification system in LifeOS yet (see DATA_MODEL.md "Not modeled yet"). What this
 * actually delivers is the same thing Ambient Display always has: a full-screen, chrome-free
 * surface with nothing else competing for attention while the timer runs.
 */
export function ActivityTimer({
  sessionId,
  activityType,
  startedAt,
}: {
  sessionId: string;
  activityType: string;
  startedAt: string;
}) {
  const router = useRouter();
  const startedAtMs = new Date(startedAt).getTime();
  const [elapsedSeconds, setElapsedSeconds] = useState(() => Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAtMs]);

  async function handleComplete() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/activities/sessions/${sessionId}`, { method: "PATCH" });
      router.push("/health");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/activities/sessions/${sessionId}`, { method: "DELETE" });
      router.push("/ambient");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 px-8 py-12 text-center">
      <p className="text-2xl font-light tracking-wide text-neutral-400 capitalize sm:text-3xl">{activityType}</p>

      <div className="text-8xl font-light tabular-nums sm:text-9xl" role="timer" aria-live="off">
        {formatElapsed(elapsedSeconds)}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={handleComplete}
          className="bg-neutral-100 text-neutral-900 hover:bg-neutral-300"
        >
          Done
        </Button>
        {/* Explicit hover color, not the ghost variant's default — this page is unconditionally
            dark (app/ambient/layout.tsx), not `dark:`-media-query-dependent like the rest of
            the app, so a light-mode-only hover class would show a pale patch here regardless
            of the visitor's system theme. */}
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={busy}
          onClick={handleCancel}
          className="text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
        >
          Cancel
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
