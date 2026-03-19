import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

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
   * ON DELETE SET NULL — deleting a user account unlinks the profile without
   * destroying the academic record.
   *
   * TRANSITION: column was added via db push in a prior session.
   * The FK constraint is now properly tracked through Drizzle migration 0001.
   */
  userId: text("user_id")
    .unique()
    .references(() => usersTable.id, { onDelete: "set null" }),
});

export type Student = typeof studentsTable.$inferSelect;
export type InsertStudent = typeof studentsTable.$inferInsert;

// ---------------------------------------------------------------------------
// papers — 已发表论文 & 毕业论文（isThesis=true）
// ---------------------------------------------------------------------------

export const papersTable = pgTable("papers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
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
  studentId: text("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
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
  // AI 汇总生成相关字段
  /** 生成状态: idle | generating | generated | failed */
  generationStatus: text("generation_status").notNull().default("idle"),
  /** JSON-stringified AiReportContent (structured generation output) */
  aiContentJson: text("ai_content_json"),
  /** 生成时选择的任意起止日期 (YYYY-MM-DD)，与 weekStart/weekEnd 独立 */
  dateRangeStart: text("date_range_start"),
  dateRangeEnd: text("date_range_end"),
  /** 本次汇总纳入的实验记录数量 */
  experimentCount: integer("experiment_count").notNull().default(0),
  /**
   * 学生最后一次主动保存 links 的时间。
   * NULL  → 从未操作过 links（旧报告），AI 生成可 fallback 到日期范围。
   * NOT NULL → 学生已显式管理过 links（哪怕保存为空），AI 生成严格按 links，不 fallback。
   */
  linksLastSavedAt: timestamp("links_last_saved_at"),
  /**
   * 学生最后一次主动保存 selected_dates 的时间。
   * NULL  → 旧报告，从未使用多日期选择模型。
   * NOT NULL → 新报告，日期集合已由学生显式确定（哪怕选了空集也不会 NULL）。
   */
  datesLastSavedAt: timestamp("dates_last_saved_at"),
});

export type WeeklyReport = typeof weeklyReportsTable.$inferSelect;
export type InsertWeeklyReport = typeof weeklyReportsTable.$inferInsert;
