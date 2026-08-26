import { boolean, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// CalDAV (iCloud) is the only provider today; `provider` stays a plain column (like
// weather_settings.provider) so a second provider — e.g. Google Calendar via OAuth — can
// reuse this table later without a migration, even though the credential shape differs
// (app-specific password vs. OAuth tokens).
export const calendarAccounts = pgTable(
  "calendar_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("icloud"),
    displayName: text("display_name").notNull(),
    caldavUsername: text("caldav_username"),
    credentialEncrypted: text("credential_encrypted"),
    syncEnabled: boolean("sync_enabled").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("calendar_accounts_user_id_idx").on(table.userId)],
);

export type CalendarAccount = typeof calendarAccounts.$inferSelect;
export type NewCalendarAccount = typeof calendarAccounts.$inferInsert;

export const CALENDAR_EVENT_STATUSES = ["confirmed", "tentative", "cancelled"] as const;
export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number];

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    calendarAccountId: uuid("calendar_account_id").references(() => calendarAccounts.id, {
      onDelete: "cascade",
    }),
    // The CalDAV event UID — the dedup key for sync upserts. Null for manually-created events.
    externalId: text("external_id"),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    status: text("status", { enum: CALENDAR_EVENT_STATUSES }).notNull().default("confirmed"),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("calendar_events_user_id_idx").on(table.userId),
    index("calendar_events_start_at_idx").on(table.startAt),
    unique("calendar_events_account_external_id_key").on(table.calendarAccountId, table.externalId),
  ],
);

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
