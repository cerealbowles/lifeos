import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

export { validateBottomNavItems } from "./bottom-nav";

export async function updateBottomNavItems(userId: string, items: (string | null)[]) {
  const [user] = await db
    .update(schema.users)
    .set({ bottomNavItems: items, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .returning();

  await logActivity({
    userId,
    domain: "settings",
    eventType: "settings.bottom_nav_updated",
    entityType: "user",
    entityId: userId,
    summary: "Updated mobile bottom nav layout",
  });

  return user;
}
