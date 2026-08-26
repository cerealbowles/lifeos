CREATE TABLE "grow_plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"strain" text NOT NULL,
	"stage" text DEFAULT 'seedling' NOT NULL,
	"date_planted" date NOT NULL,
	"trichome_status" text,
	"last_checked_at" timestamp with time zone,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grow_plants" ADD CONSTRAINT "grow_plants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grow_plants_user_id_idx" ON "grow_plants" USING btree ("user_id");