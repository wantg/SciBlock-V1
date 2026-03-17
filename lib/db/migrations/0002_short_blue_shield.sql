ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "generation_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "ai_content_json" text;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "date_range_start" text;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "date_range_end" text;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "experiment_count" integer DEFAULT 0 NOT NULL;
