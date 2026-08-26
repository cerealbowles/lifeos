import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Play } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getLatestMeasurement } from "@/lib/measurements/service";
import { getActiveSession, listRecentSessions } from "@/lib/activities/service";
import { getLatestWhoopReadings } from "@/lib/whoop/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityLogRow } from "@/components/health/activity-log-row";
import { WeightCard } from "@/components/health/weight-card";
import { WhoopCard } from "@/components/health/whoop-card";
import { WhoopTrendCard } from "@/components/health/whoop-trend-card";
import { SkinTempBaselineCard } from "@/components/health/skin-temp-baseline-card";
import { SleepLog } from "@/components/health/sleep-log";
import { QuickWorkoutLog } from "@/components/health/quick-workout-log";
import { LogPastWorkoutForm } from "@/components/health/log-past-workout-form";
import { WorkoutLog } from "@/components/health/workout-log";

/**
 * DECISIONS.md ADR-087/092/095. First real build of /health was activity-only (a
 * <ComingSoon> placeholder before that, despite the measurements table existing since
 * Milestone 0-ish). Workouts (ADR-095) live here too, not a new /workouts route — the
 * planning doc's own "new nav items are expensive, prefer... existing sections" principle,
 * and Health was already the natural home for the Activity/stretch timer log.
 */
export default async function HealthPage() {
  const user = await requireUser();
  const [measurement, activeSession, sessions, whoopReadings] = await Promise.all([
    getLatestMeasurement(user.id),
    getActiveSession(user.id),
    listRecentSessions(user.id),
    getLatestWhoopReadings(user.id),
  ]);
  const weightUnit = user.unitsSystem === "metric" ? "kg" : "lb";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Health</h1>
        {/* A plain styled Link, not <Link><Button/></Link> — Button renders a native
            <button>, and nesting interactive elements inside an <a> is invalid HTML (same
            pattern as the Ambient Display link in Settings). Desktop has no bottom nav, so
            this is the only way to start a session outside of mobile. */}
        <Link
          href={activeSession ? `/ambient/activity/${activeSession.id}` : "/activity/start"}
          className="flex shrink-0 items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800/60"
        >
          <Play className="h-4 w-4" />
          {activeSession ? "Resume stretching" : "Start stretching"}
        </Link>
      </div>

      {activeSession && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A stretch session is already running (started{" "}
          {formatDistanceToNow(new Date(activeSession.startedAt), { addSuffix: true })}).
        </p>
      )}

      <WeightCard latest={measurement} unit={weightUnit} />

      <WhoopCard latest={whoopReadings} />

      <WhoopTrendCard title="Heart Rate" type="heart_rate" unit="bpm" />
      <WhoopTrendCard title="HRV" type="hrv" unit="ms" />
      <SkinTempBaselineCard />
      <SleepLog />

      <Card>
        <CardHeader>
          <CardTitle>Workouts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <QuickWorkoutLog />
          <LogPastWorkoutForm />
          <WorkoutLog />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Nothing logged yet — {activeSession ? "finish the session in progress" : "tap Start stretching"} to
              begin.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {sessions.map((session) => (
                <ActivityLogRow
                  key={session.id}
                  id={session.id}
                  activityType={session.activityType}
                  durationSeconds={session.durationSeconds ?? 0}
                  startedAt={session.startedAt.toISOString()}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
