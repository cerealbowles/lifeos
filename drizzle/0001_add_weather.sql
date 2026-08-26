CREATE TABLE "weather_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"postal_code" text,
	"latitude" numeric NOT NULL,
	"longitude" numeric NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'openweathermap' NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"temperature" numeric NOT NULL,
	"feels_like" numeric,
	"conditions" text NOT NULL,
	"high_today" numeric,
	"low_today" numeric,
	"precipitation_chance" numeric,
	"precipitation_amount" numeric,
	"humidity" numeric,
	"wind_speed" numeric,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weather_locations" ADD CONSTRAINT "weather_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_settings" ADD CONSTRAINT "weather_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_snapshots" ADD CONSTRAINT "weather_snapshots_location_id_weather_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weather_locations_user_id_idx" ON "weather_locations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "weather_snapshots_location_id_idx" ON "weather_snapshots" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "weather_snapshots_observed_at_idx" ON "weather_snapshots" USING btree ("observed_at");