// ---------------------------------------------------------------------------
// Weekly Report domain types
// ---------------------------------------------------------------------------

export type WeeklyReportStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "reviewed";

/** AI generation lifecycle state (stored in DB column generation_status) */
export type GenerationStatus = "idle" | "generating" | "generated" | "failed";

// ---------------------------------------------------------------------------
// Manual report content (structured JSON stored in contentJson column)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AI auto-summary content (stored in ai_content_json column)
//
// Produced by the backend rule-based generator from experiment_records.
// Never call this "AI写作" or "大模型" in UI — use "自动汇总".
// ---------------------------------------------------------------------------

export interface AiProjectSummaryItem {
  sciNoteId: string;
  sciNoteTitle: string;
  experimentCount: number;
}

export interface AiStatusDistribution {
  exploring: number;    // 探索中
  reproducible: number; // 可复现
  verified: number;     // 已验证
  failed: number;       // 失败
  total: number;
  conclusion: string;   // 一句话结论
}

export interface AiParameterChange {
  paramName: string;
  changeDescription: string;
  relatedExperiments: string[];
  impact: string;
}

export interface AiOperationStep {
  step: string;
  note?: string;
}

export interface AiResultTrend {
  direction: string;
  finding: string;
  hasClearTrend: boolean;
  relatedExperiments: string[];
}

export interface AiProvenanceExperiment {
  id: string;
  title: string;
  sciNoteId: string;
  sciNoteTitle: string;
  date: string;    // YYYY-MM-DD
  status: string;  // Chinese status string
}

export interface AiReportContent {
  summary: string;
  theme: string;
  projectSummary: AiProjectSummaryItem[];
  statusDistribution: AiStatusDistribution;
  parameterChanges: AiParameterChange[];
  operationSummary: AiOperationStep[];
  resultsTrends: AiResultTrend[];
  provenanceExperiments: AiProvenanceExperiment[];
}

// ---------------------------------------------------------------------------
// Preview response (GET /reports/preview)
// ---------------------------------------------------------------------------

export interface ReportPreviewExperiment {
  id: string;
  title: string;
  sciNoteId: string;
  sciNoteTitle: string;
  status: string;
  createdAt: string;
}

export interface ReportPreviewResponse {
  experimentCount: number;
  sciNoteCount: number;
  experiments: ReportPreviewExperiment[];
}

// ---------------------------------------------------------------------------
// WeeklyReport entity (as returned by the API)
// ---------------------------------------------------------------------------

export interface WeeklyReport {
  id: string;
  studentId: string;
  title: string;
  weekStart: string;           // YYYY-MM-DD (Monday)
  weekEnd: string | null;      // YYYY-MM-DD (Sunday)
  status: WeeklyReportStatus;
  content: string;             // backward-compat plain text
  contentJson: string | null;  // JSON-stringified WeeklyReportContent
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // AI generation fields
  generationStatus: GenerationStatus;
  aiContentJson: string | null;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  experimentCount: number;
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

// ---------------------------------------------------------------------------
// API payloads
// ---------------------------------------------------------------------------

export interface CreateWeeklyReportPayload {
  studentId?: string;
  title: string;
  weekStart: string;
  weekEnd?: string;
  contentJson?: string;
  status?: WeeklyReportStatus;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export interface UpdateWeeklyReportPayload {
  title?: string;
  weekStart?: string;
  weekEnd?: string;
  contentJson?: string;
  status?: WeeklyReportStatus;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export interface AddWeeklyReportCommentPayload {
  authorId: string;
  authorName: string;
  authorRole: "instructor" | "student";
  content: string;
}

// ---------------------------------------------------------------------------
// Review payload (instructor → POST /reports/:id/review)
// ---------------------------------------------------------------------------

/** The two terminal review decisions an instructor can make on a weekly report. */
export type ReviewAction = "approve" | "request_revision";

export interface ReviewReportPayload {
  action: ReviewAction;
  reviewerName: string;
  feedbackText?: string;
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

export function parseAiContent(report: WeeklyReport): AiReportContent | null {
  if (!report.aiContentJson) return null;
  try {
    return JSON.parse(report.aiContentJson) as AiReportContent;
  } catch {
    return null;
  }
}

export function isAiGenerated(report: WeeklyReport): boolean {
  return report.generationStatus === "generated" && Boolean(report.aiContentJson);
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

/** Chinese label for experiment status */
export const EXP_STATUS_COLORS: Record<string, string> = {
  "探索中": "bg-blue-50 text-blue-700",
  "可复现": "bg-purple-50 text-purple-700",
  "已验证": "bg-green-50 text-green-700",
  "失败":   "bg-red-50 text-red-700",
};
