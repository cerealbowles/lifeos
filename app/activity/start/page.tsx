import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getOrStartActiveSession } from "@/lib/activities/service";

/**
 * DECISIONS.md ADR-087. Not a page a user ever actually sees — the "Activity" bottom-nav
 * item and the Health page's "Start Stretching" button both link here so that starting
 * (or resuming) a session is a plain server-rendered navigation, not a client-side POST +
 * router.push. Resumes any already-running session (getOrStartActiveSession) rather than
 * starting a second one, in case this gets hit twice — the bottom-nav icon tapped again
 * mid-stretch, or the tab reopened after being closed.
 */
export default async function ActivityStartPage() {
  const user = await requireUser();
  const session = await getOrStartActiveSession(user.id, "stretching");
  redirect(`/ambient/activity/${session.id}`);
}
