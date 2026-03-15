import { apiFetch } from "./client";
import type {
  WeeklyReport,
  WeeklyReportComment,
  CreateWeeklyReportPayload,
  UpdateWeeklyReportPayload,
  AddWeeklyReportCommentPayload,
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
  reports: WeeklyReport[];
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
