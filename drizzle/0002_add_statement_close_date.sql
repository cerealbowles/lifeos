ALTER TABLE "financial_accounts" ADD COLUMN "statement_close_day" integer;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD COLUMN "next_statement_close_at" timestamp with time zone;