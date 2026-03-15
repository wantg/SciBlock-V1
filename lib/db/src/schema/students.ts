import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// students — 团队成员档案
// ---------------------------------------------------------------------------

export const studentsTable = pgTable("students", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  /** URL or null; UI falls back to initials avatar */
  avatar: text("avatar"),
  enrollmentYear: integer("enrollment_year").notNull(),
  /** 'bachelor' | 'master' | 'phd' */
  degree: text("degree").notNull(),
  researchTopic: text("research_topic").notNull(),
  phone: text("phone"),
  email: text("email"),
  /** 'active' | 'pending' | 'graduated' */
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  /**
   * Foreign key into the users table (users.id).
   * Nullable — instructor accounts and unlinked legacy profiles have no user_id.
   * Unique — one user account ↔ at most one student profile.
   *
   * TRANSITION: populated via seed / admin SQL for now.
   * Long-term: introduce a proper Drizzle migration file instead of db push.
   */
  userId: text("user_id").unique(),
});

export type Student = typeof studentsTable.$inferSelect;
export type InsertStudent = typeof studentsTable.$inferInsert;

// ---------------------------------------------------------------------------
// papers — 已发表论文 & 毕业论文（isThesis=true）
// ---------------------------------------------------------------------------

export const papersTable = pgTable("papers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  title: text("title").notNull(),
  journal: text("journal"),
  year: integer("year"),
  abstract: text("abstract"),
  doi: text("doi"),
  fileName: text("file_name"),
  /** true = 毕业论文, false = 发表论文 */
  isThesis: boolean("is_thesis").notNull().default(false),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export type Paper = typeof papersTable.$inferSelect;
export type InsertPaper = typeof papersTable.$inferInsert;

// ---------------------------------------------------------------------------
// weekly_reports — 周报
// ---------------------------------------------------------------------------

export const weeklyReportsTable = pgTable("weekly_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  /** ISO date YYYY-MM-DD for the start of the week */
  weekStart: text("week_start").notNull(),
  /** ISO date YYYY-MM-DD for the end of the week (Sunday) */
  weekEnd: text("week_end"),
  /** 'draft' | 'submitted' | 'under_review' | 'needs_revision' | 'reviewed' */
  status: text("status").notNull().default("submitted"),
  /** JSON-stringified ReportContent (structured fields) */
  contentJson: text("content_json"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WeeklyReport = typeof weeklyReportsTable.$inferSelect;
export type InsertWeeklyReport = typeof weeklyReportsTable.$inferInsert;
