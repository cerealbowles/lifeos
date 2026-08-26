import "server-only";

import { db, schema } from "@/lib/db";
import { getTodayOverview } from "@/lib/today/service";
import { createNotification, hasRecentNotification } from "./service";
import type { CandidateDomain, RankedItem } from "@/lib/today/ranking";
import type { DueSummary } from "@/lib/tasks/status";

const DOMAIN_URL: Record<CandidateDomain, string> = {
  task: "/home",
  routine: "/home",
  pet: "/pets",
  financial: "/money",
  calendar: "/calendar",
  sports: "/sports",
  grow: "/grow",
};

function dueText(due: DueSummary): string | undefined {
  if (due.status === "none" || due.daysDelta === undefined) return undefined;
  if (due.status === "overdue") return due.daysDelta === 0 ? "Due today" : `${due.daysDelta}d overdue`;
  if (due.status === "due_soon") {
    const days = -due.daysDelta;
    return days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days}d`;
  }
  return undefined;
}

/**
 * DECISIONS.md/ROADMAP.md notifications pick — a NOW-tier item (the same threshold Today's
 * own ranking uses to decide something "deserves immediate attention," UX_PRIORITIZATION.md)
 * is exactly the Notification Philosophy's IMMEDIATE/TIME_SENSITIVE bar: it either needs
 * timely action (overdue) or is useful now and less useful later (everything else that
 * cleared the NOW threshold). Only fires once per entity per `hasRecentNotification`'s
 * dedupe window — an item that stays in NOW across job runs doesn't re-notify every run.
 */
async function notifyNowItem(userId: string, item: RankedItem, now: Date) {
  if (await hasRecentNotification(userId, item.domain, item.id, now)) return;

  await createNotification({
    userId,
    type: `${item.domain}_now`,
    category: item.due.status === "overdue" ? "immediate" : "time_sensitive",
    title: item.title,
    body: item.subtitle ?? dueText(item.due),
    entityType: item.domain,
    entityId: item.id,
    url: DOMAIN_URL[item.domain],
  });
}

export async function generateNotificationsForAllUsers(now: Date = new Date()): Promise<{ refreshed: number; failed: number }> {
  const users = await db.select().from(schema.users);

  let refreshed = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const overview = await getTodayOverview(user, now);
      for (const item of overview.now) {
        await notifyNowItem(user.id, item, now);
      }
      refreshed += 1;
    } catch {
      failed += 1;
    }
  }

  return { refreshed, failed };
}
