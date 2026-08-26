CREATE TABLE "grow_plant_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"immich_asset_id" text NOT NULL,
	"caption" text,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grow_plants" ADD COLUMN "immich_album_id" text;--> statement-breakpoint
ALTER TABLE "grow_plant_photos" ADD CONSTRAINT "grow_plant_photos_plant_id_grow_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."grow_plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grow_plant_photos" ADD CONSTRAINT "grow_plant_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grow_plant_photos_plant_id_taken_at_idx" ON "grow_plant_photos" USING btree ("plant_id","taken_at");--> statement-breakpoint
CREATE INDEX "grow_plant_photos_user_id_idx" ON "grow_plant_photos" USING btree ("user_id");