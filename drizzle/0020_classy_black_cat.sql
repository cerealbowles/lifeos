CREATE TABLE "grow_plant_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stage" text,
	"trichome_status" text,
	"notes" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grow_plant_checkins" ADD CONSTRAINT "grow_plant_checkins_plant_id_grow_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."grow_plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grow_plant_checkins" ADD CONSTRAINT "grow_plant_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grow_plant_checkins_plant_id_checked_at_idx" ON "grow_plant_checkins" USING btree ("plant_id","checked_at");--> statement-breakpoint
CREATE INDEX "grow_plant_checkins_user_id_idx" ON "grow_plant_checkins" USING btree ("user_id");