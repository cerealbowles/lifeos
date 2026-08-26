import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getSession } from "@/lib/activities/service";
import { ActivityTimer } from "@/components/ambient/activity-timer";

/**
 * DECISIONS.md ADR-087 — the ambient stopwatch for a timed activity (e.g. a nightly stretch).
 * Nested under app/ambient/ specifically to inherit its chrome-free dark layout — this is
 * meant to be looked at while stretching, not interacted with beyond Done/Cancel.
 */
export default async function ActivityAmbientPage({ params }: PageProps<"/ambient/activity/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  const session = await getSession(user.id, id);
  if (!session) notFound();
  if (session.endedAt) redirect("/health"); // Already completed — nothing left to time.

  return (
    <ActivityTimer sessionId={session.id} activityType={session.activityType} startedAt={session.startedAt.toISOString()} />
  );
}
