import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  unitsSystem: text("units_system", { enum: ["imperial", "metric"] })
    .notNull()
    .default("imperial"),
  // Single cursor for Feed's "you're caught up" closure state (DECISIONS.md ADR-052) — not
  // per-item read/saved tracking (see DATA_MODEL.md's feed.ts note on that being deferred),
  // just "how far has the user scrolled through Feed as of their last visit." Null means
  // never visited /feed yet.
  feedLastViewedAt: timestamp("feed_last_viewed_at", { withTimezone: true }),
  // Exactly 4 slots — [leftOuter, leftInner, rightInner, rightOuter] — for the mobile bottom
  // nav's user-customizable positions around the fixed-center Today tab (DECISIONS.md
  // ADR-085). Each slot is a primaryNav/askNav href or null (empty). Null (the column, not a
  // slot) means "never configured" — lib/nav.ts's DEFAULT_BOTTOM_NAV_ITEMS fills in for that
  // case, kept in application code rather than a DB-level default, matching this codebase's
  // existing nullable-jsonb convention (e.g. agent_messages.token_usage).
  bottomNavItems: jsonb("bottom_nav_items").$type<(string | null)[] | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Server-side session store. The client only ever holds an opaque token;
// we store a hash of it here so a leaked DB dump doesn't yield live sessions.
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
