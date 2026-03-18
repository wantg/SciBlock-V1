/**
 * ReportService — business logic for weekly report operations.
 *
 * Rule: no direct DB queries; no HTTP/Express imports.
 * Only calls repository functions and applies business rules.
 */

import {
  findReportById,
  markReportSubmitted,
  setReportStatus,
  type ReportRow,
} from "../repositories/report.repository";

// ---------------------------------------------------------------------------
// Submit report
// ---------------------------------------------------------------------------

export type SubmitReportErrorCode =
  | "not_found"
  | "forbidden"
  | "already_submitted"
  | "missing_content";

export interface SubmitReportError {
  code: SubmitReportErrorCode;
  message: string;
}

export type SubmitReportResult =
  | { ok: true; report: ReportRow }
  | { ok: false; error: SubmitReportError };

/**
 * Submits a weekly report on behalf of a student.
 *
 * Business rules enforced here (not in the route):
 *  - The report must belong to the given studentId (ownership check).
 *  - The report must be in draft or needs_revision state.
 *  - The report must have actual content (contentJson or aiContentJson).
 *  - On success: status → submitted, submittedAt written.
 *
 * Returns a discriminated union so the route layer can map to HTTP status
 * codes without containing any business logic itself.
 */
export async function submitReport(
  reportId: string,
  studentId: string,
): Promise<SubmitReportResult> {
  const report = await findReportById(reportId);

  if (!report) {
    return { ok: false, error: { code: "not_found", message: "Report not found" } };
  }

  if (report.studentId !== studentId) {
    return {
      ok: false,
      error: { code: "forbidden", message: "You can only submit your own reports" },
    };
  }

  // Only draft and needs_revision may transition to submitted
  const submittableStatuses = ["draft", "needs_revision"];
  if (!submittableStatuses.includes(report.status)) {
    return {
      ok: false,
      error: {
        code: "already_submitted",
        message: "This report has already been submitted",
      },
    };
  }

  // Require at least one content field to have actual data
  const hasContent =
    (report.contentJson !== null && report.contentJson !== "") ||
    (report.aiContentJson !== null && report.aiContentJson !== "");

  if (!hasContent) {
    return {
      ok: false,
      error: {
        code: "missing_content",
        message: "Report must have content before submitting. Please save your content first.",
      },
    };
  }

  const updated = await markReportSubmitted(reportId);
  if (!updated) {
    return {
      ok: false,
      error: { code: "not_found", message: "Report disappeared during update" },
    };
  }

  return { ok: true, report: updated };
}

// ---------------------------------------------------------------------------
// Review report (instructor action)
// ---------------------------------------------------------------------------

/** The two outcome actions an instructor can take when reviewing a report. */
export type ReviewAction = "approve" | "request_revision";

export type ReviewReportErrorCode =
  | "not_found"
  | "invalid_state";

export interface ReviewReportError {
  code: ReviewReportErrorCode;
  message: string;
}

export type ReviewReportResult =
  | { ok: true; report: ReportRow }
  | { ok: false; error: ReviewReportError };

/**
 * Records an instructor's review decision for a weekly report.
 *
 * Business rules enforced here (not in the route):
 *  - The report must be in a reviewable state (submitted, under_review, needs_revision).
 *    Drafts have not been shared with the instructor; already-reviewed reports
 *    may be re-reviewed.
 *  - approve    → status: "reviewed",      reviewedAt written.
 *  - request_revision → status: "needs_revision".
 *
 * Side-effect (notification) is intentionally left to the route layer so this
 * service has no dependency on the messaging infrastructure.
 *
 * Returns a discriminated union so the route layer maps errors to HTTP codes
 * without containing any business logic itself.
 */
export async function reviewReport(
  reportId: string,
  action: ReviewAction,
): Promise<ReviewReportResult> {
  const report = await findReportById(reportId);

  if (!report) {
    return { ok: false, error: { code: "not_found", message: "Report not found" } };
  }

  const reviewableStatuses = ["submitted", "under_review", "needs_revision", "reviewed"];
  if (!reviewableStatuses.includes(report.status)) {
    return {
      ok: false,
      error: {
        code: "invalid_state",
        message: `Cannot review a report with status: ${report.status}`,
      },
    };
  }

  const newStatus = action === "approve" ? "reviewed" : "needs_revision";

  const updated = await setReportStatus(reportId, newStatus);
  if (!updated) {
    return {
      ok: false,
      error: { code: "not_found", message: "Report disappeared during update" },
    };
  }

  return { ok: true, report: updated };
}
