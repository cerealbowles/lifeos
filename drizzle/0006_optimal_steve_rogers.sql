CREATE TABLE "feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_url" text NOT NULL,
	"guid" text NOT NULL,
	"title" text NOT NULL,
	"link" text,
	"summary" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_items_feed_url_guid_key" UNIQUE("feed_url","guid")
);
--> statement-breakpoint
CREATE TABLE "feed_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feed_url" text NOT NULL,
	"title" text NOT NULL,
	"site_url" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_subscriptions_user_feed_key" UNIQUE("user_id","feed_url")
);
--> statement-breakpoint
ALTER TABLE "feed_subscriptions" ADD CONSTRAINT "feed_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_items_feed_url_published_at_idx" ON "feed_items" USING btree ("feed_url","published_at");--> statement-breakpoint
CREATE INDEX "feed_subscriptions_user_id_idx" ON "feed_subscriptions" USING btree ("user_id");