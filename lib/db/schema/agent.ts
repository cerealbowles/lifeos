import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const agentConversations = pgTable(
  "agent_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("agent_conversations_user_id_idx").on(table.userId)],
);

export type AgentConversation = typeof agentConversations.$inferSelect;
export type NewAgentConversation = typeof agentConversations.$inferInsert;

export const AGENT_MESSAGE_ROLES = ["system", "user", "assistant", "tool"] as const;
export type AgentMessageRole = (typeof AGENT_MESSAGE_ROLES)[number];

// Conversation state is persisted here, not relied on from the provider — see
// DECISIONS.md ADR-004: if the model changes, LifeOS should still remember the conversation.
export const agentMessages = pgTable(
  "agent_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => agentConversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: AGENT_MESSAGE_ROLES }).notNull(),
    content: text("content").notNull(),
    // Set when role = "tool": which tool produced this message, and the call it answers.
    toolName: text("tool_name"),
    toolCallId: text("tool_call_id"),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    tokenUsage: jsonb("token_usage").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("agent_messages_conversation_id_idx").on(table.conversationId)],
);

export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;

export const AGENT_ACTION_STATUSES = ["success", "error"] as const;
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];

// Every tool execution — read or write — is recorded here, per spec §25. Milestone 7 only
// ever writes status/requiredConfirmation for read tools (always success, never requires
// confirmation); the columns exist now so Milestone 8's write tools don't need a migration.
export const agentActions = pgTable(
  "agent_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => agentConversations.id, {
      onDelete: "set null",
    }),
    toolName: text("tool_name").notNull(),
    toolInput: jsonb("tool_input").$type<Record<string, unknown> | null>(),
    toolOutputSummary: text("tool_output_summary"),
    status: text("status", { enum: AGENT_ACTION_STATUSES }).notNull(),
    requiredConfirmation: boolean("required_confirmation").notNull().default(false),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("agent_actions_user_id_idx").on(table.userId),
    index("agent_actions_conversation_id_idx").on(table.conversationId),
  ],
);

export type AgentAction = typeof agentActions.$inferSelect;
export type NewAgentAction = typeof agentActions.$inferInsert;
