import "server-only";

import { db, schema } from "@/lib/db";

export async function logActivity(params: {
  userId: string;
  domain: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(schema.activityEvents).values({
    userId: params.userId,
    domain: params.domain,
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    summary: params.summary,
    metadata: params.metadata ?? null,
  });
}
