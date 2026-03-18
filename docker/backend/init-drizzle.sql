CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  role text DEFAULT 'student' NOT NULL,
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS students (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  avatar text,
  enrollment_year integer NOT NULL,
  degree text NOT NULL,
  research_topic text NOT NULL,
  phone text,
  email text,
  status text DEFAULT 'active' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  user_id text,
  CONSTRAINT students_user_id_unique UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS papers (
  id text PRIMARY KEY NOT NULL,
  student_id text NOT NULL,
  title text NOT NULL,
  journal text,
  year integer,
  abstract text,
  doi text,
  file_name text,
  is_thesis boolean DEFAULT false NOT NULL,
  uploaded_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id text PRIMARY KEY NOT NULL,
  student_id text NOT NULL,
  title text NOT NULL,
  content text DEFAULT '' NOT NULL,
  week_start text NOT NULL,
  week_end text,
  status text DEFAULT 'submitted' NOT NULL,
  content_json text,
  submitted_at timestamp,
  reviewed_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS report_comments (
  id text PRIMARY KEY NOT NULL,
  report_id text NOT NULL,
  author_id text NOT NULL,
  author_name text NOT NULL,
  author_role text DEFAULT 'instructor' NOT NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY NOT NULL,
  recipient_id text NOT NULL,
  sender_name text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'unread' NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb,
  created_at timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_recipient_id_users_id_fk') THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_recipient_id_users_id_fk
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'papers_student_id_students_id_fk') THEN
    ALTER TABLE papers
      ADD CONSTRAINT papers_student_id_students_id_fk
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_user_id_users_id_fk') THEN
    ALTER TABLE students
      ADD CONSTRAINT students_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_reports_student_id_students_id_fk') THEN
    ALTER TABLE weekly_reports
      ADD CONSTRAINT weekly_reports_student_id_students_id_fk
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_comments_report_id_weekly_reports_id_fk') THEN
    ALTER TABLE report_comments
      ADD CONSTRAINT report_comments_report_id_weekly_reports_id_fk
      FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE;
  END IF;
END $$;
