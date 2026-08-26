CREATE TABLE "sleep_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"source" text DEFAULT 'whoop' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_stage_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sleep_session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_stage_segments" ADD CONSTRAINT "sleep_stage_segments_sleep_session_id_sleep_sessions_id_fk" FOREIGN KEY ("sleep_session_id") REFERENCES "public"."sleep_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_stage_segments" ADD CONSTRAINT "sleep_stage_segments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sleep_sessions_user_id_idx" ON "sleep_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sleep_sessions_started_at_idx" ON "sleep_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "sleep_stage_segments_session_id_idx" ON "sleep_stage_segments" USING btree ("sleep_session_id");--> statement-breakpoint
CREATE INDEX "sleep_stage_segments_user_id_idx" ON "sleep_stage_segments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sleep_stage_segments_started_at_idx" ON "sleep_stage_segments" USING btree ("started_at");