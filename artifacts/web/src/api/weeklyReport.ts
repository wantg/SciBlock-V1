import { apiFetch } from "./client";
import type {
  WeeklyReport,
  WeeklyReportComment,
  CreateWeeklyReportPayload,
  UpdateWeeklyReportPayload,
  AddWeeklyReportCommentPayload,
  ReportPreviewResponse,
  ReviewReportPayload,
} from "@/types/weeklyReport";

// ---------------------------------------------------------------------------
// Student-side
// ---------------------------------------------------------------------------

/**
 * Fetches the current user's own weekly reports.
 * The backend derives the student identity from the JWT — no studentId param needed.
 * Returns 409 (surfaced as ApiError) when the user account has no student binding.
 */
export function fetchMyReports(): Promise<WeeklyReport[]> {
  return apiFetch<WeeklyReport[]>("/reports");
}

// ---------------------------------------------------------------------------
// Preview — GET /reports/preview?dateStart=...&dateEnd=...
//
// Returns experiments that fall in the given date range for the current user.
// Used in Step 2 of the Generate Report wizard to show what will be included.
// ---------------------------------------------------------------------------

export function fetchReportPreview(dateStart: string, dateEnd: string): Promise<ReportPreviewResponse> {
  const qs = `?dateStart=${encodeURIComponent(dateStart)}&dateEnd=${encodeURIComponent(dateEnd)}`;
  return apiFetch<ReportPreviewResponse>(`/reports/preview${qs}`);
}

// ---------------------------------------------------------------------------
// Generate — POST /reports/:id/generate
//
// Triggers async rule-based content generation. Returns 202 immediately.
// Poll GET /reports/:id until generationStatus is "generated" or "failed".
// ---------------------------------------------------------------------------

export interface TriggerGenerateResponse {
  reportId: string;
  generationStatus: "generating";
}

export function triggerGenerate(reportId: string): Promise<TriggerGenerateResponse> {
  return apiFetch<TriggerGenerateResponse>(`/reports/${reportId}/generate`, { method: "POST" });
}

/**
 * Polls a single report until generationStatus !== "generating", or until
 * maxAttempts is reached (throws on timeout).
 *
 * @param reportId   Report ID to poll
 * @param intervalMs Polling interval in ms (default 1500)
 * @param maxAttempts Maximum polls before throwing (default 20, ~30 s)
 */
export async function pollUntilGenerated(
  reportId: string,
  intervalMs = 1500,
  maxAttempts = 20,
): Promise<WeeklyReport> {
  for (let i = 0; i < maxAttempts; i++) {
    const report = await apiFetch<WeeklyReport>(`/reports/${reportId}`);
    if (report.generationStatus !== "generating") return report;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error("生成超时，请稍后刷新页面查看结果。");
}

// ---------------------------------------------------------------------------
// Instructor-side: team view
// ---------------------------------------------------------------------------

export interface TeamReportsResponse {
  students: Array<{
    id: string;
    name: string;
    status: string;
    degree: string;
    researchTopic: string;
    avatar: string | null;
  }>;
  /** Submitted reports for the queried week only (no drafts). */
  reports: WeeklyReport[];
  /**
   * Each student's most recently submitted report across ALL weeks.
   * Used by the instructor view to show "last submission" context
   * when a student has no report for the currently selected week.
   */
  lastSubmissions: WeeklyReport[];
}

export function fetchTeamReports(weekStart?: string): Promise<TeamReportsResponse> {
  const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  return apiFetch<TeamReportsResponse>(`/reports/team${qs}`);
}

// ---------------------------------------------------------------------------
// Single report
// ---------------------------------------------------------------------------

export function fetchReport(id: string): Promise<WeeklyReport> {
  return apiFetch<WeeklyReport>(`/reports/${id}`);
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createReport(payload: CreateWeeklyReportPayload): Promise<WeeklyReport> {
  return apiFetch<WeeklyReport>("/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Submits a report via the dedicated submit endpoint.
 *
 * Unlike updateReport({ status: "submitted" }), this endpoint enforces:
 *  - Student-only access (403 otherwise)
 *  - Ownership check (student can only submit their own)
 *  - Content presence validation (422 if no content exists)
 *  - Atomic submittedAt timestamp
 *
 * Call this after saving draft content if the student edited the report
 * before submitting.
 */
export function submitReport(id: string): Promise<WeeklyReport> {
  return apiFetch<WeeklyReport>(`/reports/${id}/submit`, { method: "POST" });
}

export function updateReport(
  id: string,
  payload: UpdateWeeklyReportPayload,
): Promise<WeeklyReport> {
  return apiFetch<WeeklyReport>(`/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteReport(id: string): Promise<void> {
  return apiFetch<void>(`/reports/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Review — POST /reports/:id/review (instructor-only)
//
// Atomically: updates the report status (reviewed | needs_revision),
// optionally inserts a comment, and sends a message notification to the student.
// ---------------------------------------------------------------------------

/**
 * Records the instructor's review decision for a weekly report.
 *
 * @param id      Report ID
 * @param payload action + reviewerName + optional feedbackText
 * @returns The updated WeeklyReport
 */
export function reviewReport(
  id: string,
  payload: ReviewReportPayload,
): Promise<WeeklyReport> {
  return apiFetch<WeeklyReport>(`/reports/${id}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function fetchReportComments(reportId: string): Promise<WeeklyReportComment[]> {
  return apiFetch<WeeklyReportComment[]>(`/reports/${reportId}/comments`);
}

export function addReportComment(
  reportId: string,
  payload: AddWeeklyReportCommentPayload,
): Promise<WeeklyReportComment> {
  return apiFetch<WeeklyReportComment>(`/reports/${reportId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
