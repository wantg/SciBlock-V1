/**
 * ReportService — business logic for weekly report operations.
 *
 * Rule: no direct DB queries; no HTTP/Express imports.
 * Only calls repository functions and applies business rules.
 */

import {
  findReportById,
  markReportSubmitted,
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
