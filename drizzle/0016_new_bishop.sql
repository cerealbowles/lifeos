-- DECISIONS.md ADR-099. Existing rows were keyed by the old ESPN sport_path/league_path/
-- team_external_id shape and have no sport/team_abbr value (added nullable in the prior
-- migration, never backfilled) — there's no mapping from an ESPN team id to a plain
-- abbreviation, so these rows can't be migrated forward. Clearing them is the explicit
-- consequence of replacing the ESPN-based sports source entirely; re-adding favorites under
-- the new (sport, team_abbr) shape is a quick manual step in Settings afterward.
DELETE FROM "favorite_teams" WHERE "sport" IS NULL;--> statement-breakpoint
ALTER TABLE "favorite_teams" DROP CONSTRAINT "favorite_teams_user_team_key";--> statement-breakpoint
ALTER TABLE "favorite_teams" ALTER COLUMN "sport" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite_teams" ALTER COLUMN "team_abbr" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite_teams" DROP COLUMN "sport_path";--> statement-breakpoint
ALTER TABLE "favorite_teams" DROP COLUMN "league_path";--> statement-breakpoint
ALTER TABLE "favorite_teams" DROP COLUMN "league";--> statement-breakpoint
ALTER TABLE "favorite_teams" DROP COLUMN "team_external_id";--> statement-breakpoint
ALTER TABLE "favorite_teams" DROP COLUMN "last_synced_at";--> statement-breakpoint
ALTER TABLE "favorite_teams" ADD CONSTRAINT "favorite_teams_user_team_key" UNIQUE("user_id","sport","team_abbr");