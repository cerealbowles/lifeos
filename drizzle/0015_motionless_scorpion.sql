DROP TABLE "sports_events" CASCADE;--> statement-breakpoint
ALTER TABLE "favorite_teams" ADD COLUMN "sport" text;--> statement-breakpoint
ALTER TABLE "favorite_teams" ADD COLUMN "team_abbr" text;