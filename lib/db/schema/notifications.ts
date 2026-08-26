import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * `category` implements the calm-computing doc's Notification Philosophy
 * (docs/CALM_COMPUTING_DECISIONS.md): IMMEDIATE/TIME_SENSITIVE get a push sent, DIGEST/SILENT
 * are stored for the in-app notification list only — see lib/notifications/service.ts
 * `createNotification`. `entity_type`/`entity_id` point back at the source record (e.g.
 * domain="task", id=<task id>) so the notifications job can dedupe against
 * already-notified entities instead of re-alerting on every run — CLAUDE.md's "suppression is
 * a feature."
 */
export const notificationCategories = ["immediate", "time_sensitive", "digest", "silent"] as const;
export type NotificationCategory = (typeof notificationCategories)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    category: text("category").notNull().$type<NotificationCategory>(),
    title: text("title").notNull(),
    body: text("body"),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    url: text("url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_entity_idx").on(table.userId, table.entityType, table.entityId),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/** One row per browser/device Web Push subscription — a user can have several. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("push_subscriptions_user_id_idx").on(table.userId)],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
