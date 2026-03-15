import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// report_comments — 周报评论 / 导师反馈
// ---------------------------------------------------------------------------

export const reportCommentsTable = pgTable("report_comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reportId: text("report_id").notNull(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  /** 'instructor' | 'student' */
  authorRole: text("author_role").notNull().default("instructor"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ReportComment = typeof reportCommentsTable.$inferSelect;
export type InsertReportComment = typeof reportCommentsTable.$inferInsert;
