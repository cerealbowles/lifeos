import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AgentActionStatus, AgentMessageRole } from "@/lib/db/schema";

export async function createConversation(userId: string, firstMessage: string) {
  const title = firstMessage.length > 60 ? `${firstMessage.slice(0, 57)}...` : firstMessage;
  const [conversation] = await db.insert(schema.agentConversations).values({ userId, title }).returning();
  return conversation;
}

export async function getConversation(userId: string, conversationId: string) {
  const [conversation] = await db
    .select()
    .from(schema.agentConversations)
    .where(and(eq(schema.agentConversations.id, conversationId), eq(schema.agentConversations.userId, userId)))
    .limit(1);
  return conversation ?? null;
}

export async function listConversations(userId: string) {
  return db
    .select()
    .from(schema.agentConversations)
    .where(eq(schema.agentConversations.userId, userId))
    .orderBy(desc(schema.agentConversations.updatedAt));
}

/** Clean Q&A history for feeding back into the model on a new turn — see lib/agent/agent.ts. */
export async function listVisibleMessages(conversationId: string) {
  const messages = await db
    .select()
    .from(schema.agentMessages)
    .where(eq(schema.agentMessages.conversationId, conversationId))
    .orderBy(asc(schema.agentMessages.createdAt));

  return messages.filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0);
}

export async function appendMessage(
  conversationId: string,
  input: {
    role: AgentMessageRole;
    content: string;
    toolName?: string;
    toolCallId?: string;
    modelProvider?: string;
    modelName?: string;
  },
) {
  await db.insert(schema.agentMessages).values({ conversationId, ...input });
  await db
    .update(schema.agentConversations)
    .set({ updatedAt: new Date() })
    .where(eq(schema.agentConversations.id, conversationId));
}

export async function logAction(
  userId: string,
  conversationId: string | null,
  toolName: string,
  toolInput: Record<string, unknown>,
  toolOutputSummary: string,
  status: AgentActionStatus,
) {
  await db.insert(schema.agentActions).values({
    userId,
    conversationId,
    toolName,
    toolInput,
    toolOutputSummary,
    status,
  });
}
