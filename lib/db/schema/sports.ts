import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * DECISIONS.md ADR-099. Per-user favorite teams — replaces the old ESPN-id-based shape
 * (sport_path/league_path/team_external_id) with a plain (sport, team_abbr) pair, since the
 * new sports-betting-backed data source (lib/sports/betting-client.ts) has no team-id system
 * at all, just standard abbreviations ("NYY", "KC", "SF", etc.). `sport` is "mlb" | "nfl" —
 * plain text, not a Postgres enum, same open-ended reasoning as tasks.category. No more
 * `last_synced_at` — favorites are now just a static preference, nothing to sync per-team
 * (games are fetched live on read, see lib/sports/service.ts).
 */
export const favoriteTeams = pgTable(
  "favorite_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sport: text("sport").notNull(),
    teamAbbr: text("team_abbr").notNull(),
    teamName: text("team_name").notNull(),
    priority: integer("priority").notNull().default(0),
    notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("favorite_teams_user_id_idx").on(table.userId),
    unique("favorite_teams_user_team_key").on(table.userId, table.sport, table.teamAbbr),
  ],
);

export type FavoriteTeam = typeof favoriteTeams.$inferSelect;
export type NewFavoriteTeam = typeof favoriteTeams.$inferInsert;
