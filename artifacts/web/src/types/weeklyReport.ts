// ---------------------------------------------------------------------------
// Weekly Report domain types
// ---------------------------------------------------------------------------

export type WeeklyReportStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "reviewed";

export interface WeeklyReportContent {
  completed: string;    // 本周完成内容
  progress: string;     // 当前实验进展
  problems: string;     // 遇到的问题
  nextWeekPlan: string; // 下周计划
  helpNeeded: string;   // 需要导师帮助的事项
}

export const EMPTY_REPORT_CONTENT: WeeklyReportContent = {
  completed: "",
  progress: "",
  problems: "",
  nextWeekPlan: "",
  helpNeeded: "",
};

export interface WeeklyReport {
  id: string;
  studentId: string;
  title: string;
  weekStart: string;      // YYYY-MM-DD (Monday)
  weekEnd: string | null; // YYYY-MM-DD (Sunday)
  status: WeeklyReportStatus;
  content: string;         // backward-compat plain text
  contentJson: string | null; // JSON-stringified WeeklyReportContent
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReportComment {
  id: string;
  reportId: string;
  authorId: string;
  authorName: string;
  authorRole: "instructor" | "student";
  content: string;
  createdAt: string;
}

export interface CreateWeeklyReportPayload {
  studentId: string;
  title: string;
  weekStart: string;
  weekEnd?: string;
  contentJson?: string;
  status?: WeeklyReportStatus;
}

export interface UpdateWeeklyReportPayload {
  title?: string;
  weekStart?: string;
  weekEnd?: string;
  contentJson?: string;
  status?: WeeklyReportStatus;
}

export interface AddWeeklyReportCommentPayload {
  authorId: string;
  authorName: string;
  authorRole: "instructor" | "student";
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function parseReportContent(report: WeeklyReport): WeeklyReportContent {
  if (report.contentJson) {
    try {
      return JSON.parse(report.contentJson) as WeeklyReportContent;
    } catch {
      return { ...EMPTY_REPORT_CONTENT };
    }
  }
  return { ...EMPTY_REPORT_CONTENT, completed: report.content };
}

/** Returns the Monday (ISO) of the week containing `date`. */
export function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Returns the Sunday (ISO) of the week containing `date`. */
export function getWeekSunday(date: Date): string {
  const monday = getWeekMonday(date);
  const d = new Date(monday + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

/** Formats YYYY-MM-DD as "MM/DD" */
export function fmtDate(iso: string): string {
  return iso.slice(5).replace("-", "/");
}

/** Formats a week range as "MM/DD - MM/DD" */
export function fmtWeekRange(weekStart: string, weekEnd: string | null): string {
  if (!weekEnd) return fmtDate(weekStart) + " 起";
  return `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`;
}

/** e.g. "2026-03-09" → "2026年 第11周" */
export function fmtWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  const year = d.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}年 第${weekNum}周`;
}
