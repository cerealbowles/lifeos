CREATE TABLE "favorite_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport_path" text NOT NULL,
	"league_path" text NOT NULL,
	"league" text NOT NULL,
	"team_external_id" text NOT NULL,
	"team_name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_teams_user_team_key" UNIQUE("user_id","league_path","team_external_id")
);
--> statement-breakpoint
CREATE TABLE "sports_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'espn' NOT NULL,
	"external_id" text NOT NULL,
	"league" text NOT NULL,
	"home_team_external_id" text NOT NULL,
	"home_team_name" text NOT NULL,
	"away_team_external_id" text NOT NULL,
	"away_team_name" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sports_events_provider_external_id_key" UNIQUE("provider","external_id")
);
--> statement-breakpoint
ALTER TABLE "favorite_teams" ADD CONSTRAINT "favorite_teams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorite_teams_user_id_idx" ON "favorite_teams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sports_events_start_at_idx" ON "sports_events" USING btree ("start_at");