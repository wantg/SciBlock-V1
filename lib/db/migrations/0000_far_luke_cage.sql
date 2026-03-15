CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"sender_name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"title" text NOT NULL,
	"journal" text,
	"year" integer,
	"abstract" text,
	"doi" text,
	"file_name" text,
	"is_thesis" boolean DEFAULT false NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"enrollment_year" integer NOT NULL,
	"degree" text NOT NULL,
	"research_topic" text NOT NULL,
	"phone" text,
	"email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	CONSTRAINT "students_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"week_start" text NOT NULL,
	"week_end" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"content_json" text,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"author_role" text DEFAULT 'instructor' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
