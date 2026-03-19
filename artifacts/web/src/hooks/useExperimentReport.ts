/**
 * useExperimentReport — encapsulates manual report generation state and actions.
 *
 * Layer: Business logic hook (no UI, no direct context access).
 *
 * Owns the logic for:
 *   - reportStatus derivation
 *   - triggerReportGeneration   (first-time generation — idle state)
 *   - triggerRegenerate         (atomic replace — ready state, no race condition)
 *   - commitReport              (await save to backend — called from "保存修改" button)
 *   - clearReport               (DELETE from DB — manual "clear report" action)
 *
 * The *automatic* trigger path (all 5 modules confirmed → auto-generate) is
 * intentionally left inside setModuleStatus() in WorkbenchContext so that its
 * direct setState calls work without change.
 *
 * Phase 2.1 changes:
 *   - Removed debounced updateReport (it was only called from the save button,
 *     making the 2 s delay a silent data-loss risk on refresh).
 *   - Added commitReport: awaits PUT /report before returning, so "保存修改" is
 *     semantically equal to "backend has persisted the change".
 *   - Added triggerRegenerate: sends a single POST /report/regenerate (atomic
 *     overwrite on the server) — eliminates the DELETE+POST race condition.
 */

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ExperimentRecord } from "@/types/workbench";
import type { ReportStatus } from "@/types/report";
import {
  generateReport,
  regenerateReport,
  saveReport,
  clearExperimentReport,
} from "@/api/experiments";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseExperimentReportParams {
  /** Current record snapshot (used as the source for report generation). */
  currentRecord:      ExperimentRecord;
  /** Stable ID of the current record — used to update the correct item in setRecords. */
  currentRecordId:    string;
  /**
   * State ownership stays in WorkbenchContext so that setModuleStatus()'s
   * auto-trigger path can continue to call setIsGenerating / setHasError
   * directly without being refactored.
   */
  isGenerating:       boolean;
  hasError:           boolean;
  setIsGenerating:    Dispatch<SetStateAction<boolean>>;
  setHasError:        Dispatch<SetStateAction<boolean>>;
  /** Full records setter — report generation writes reportHtml via functional update. */
  setRecords:         Dispatch<SetStateAction<ExperimentRecord[]>>;
  /**
   * Convenience patcher for the current record.
   * Defined in WorkbenchContext and closes over the latest currentRecordId.
   */
  patchCurrentRecord: (patch: Partial<ExperimentRecord>) => void;
}

export interface UseExperimentReportResult {
  /** Derived from isGenerating + hasError + currentRecord.reportHtml */
  reportStatus:            ReportStatus;
  /** First-time generation (idle state). Calls POST /report/generate. */
  triggerReportGeneration: () => void;
  /**
   * Atomic replace of an existing report (ready state).
   * Clears local state immediately (shows spinner), then calls
   * POST /report/regenerate — a single request that overwrites the DB row.
   * No separate DELETE is sent, eliminating the concurrent-request race condition.
   */
  triggerRegenerate:       () => void;
  /**
   * Await-able save for the "保存修改" button.
   * Immediately patches local state, then awaits PUT /report.
   * Throws on network/server error so the caller can show error feedback.
   * No debounce — "保存修改" semantically means "already saved to backend".
   */
  commitReport:            (html: string) => Promise<void>;
  /** Clear the generated report: patches local state + calls DELETE /report. */
  clearReport:             () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExperimentReport({
  currentRecord,
  currentRecordId,
  isGenerating,
  hasError,
  setIsGenerating,
  setHasError,
  setRecords,
  patchCurrentRecord,
}: UseExperimentReportParams): UseExperimentReportResult {

  // Derive reportStatus — no memo needed, values are primitives / object ref.
  const reportStatus: ReportStatus =
    isGenerating          ? "generating"
    : hasError            ? "error"
    : currentRecord.reportHtml ? "ready"
    : "idle";

  /**
   * First-time generation: user clicks "生成报告" in idle state, or retries after error.
   * Calls POST /report/generate.
   */
  const triggerReportGeneration = useCallback(() => {
    if (isGenerating) return;
    setIsGenerating(true);
    setHasError(false);

    generateReport(currentRecordId)
      .then((html) => {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === currentRecordId ? { ...r, reportHtml: html } : r,
          ),
        );
        setIsGenerating(false);
      })
      .catch(() => {
        setIsGenerating(false);
        setHasError(true);
      });
  }, [
    isGenerating,
    currentRecordId,
    setIsGenerating,
    setHasError,
    setRecords,
  ]);

  /**
   * Atomic regeneration: user clicks "重新生成" while report is ready.
   *
   * The local report fields are cleared immediately (UI switches to spinner).
   * A single POST /report/regenerate is sent — the backend atomically overwrites
   * the existing DB row without a preceding DELETE, so there is no race condition
   * between two concurrent requests writing the same row.
   */
  const triggerRegenerate = useCallback(() => {
    if (isGenerating) return;
    // Clear local state to show the spinner — no backend DELETE call.
    patchCurrentRecord({
      reportHtml:          undefined,
      reportSource:        undefined,
      reportGeneratedAt:   undefined,
      reportUpdatedAt:     undefined,
    });
    setIsGenerating(true);
    setHasError(false);

    regenerateReport(currentRecordId)
      .then((html) => {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === currentRecordId ? { ...r, reportHtml: html } : r,
          ),
        );
        setIsGenerating(false);
      })
      .catch(() => {
        setIsGenerating(false);
        setHasError(true);
      });
  }, [
    isGenerating,
    currentRecordId,
    patchCurrentRecord,
    setIsGenerating,
    setHasError,
    setRecords,
  ]);

  /**
   * Await-able commit for the "保存修改" button.
   *
   * 1. Patches local state immediately (React re-render + sessionStorage).
   * 2. Awaits PUT /report — throws on failure.
   *
   * No debounce. This function must be called from an async handler so the
   * caller can await it, show loading state, and display success/failure.
   */
  const commitReport = useCallback(
    async (html: string): Promise<void> => {
      patchCurrentRecord({ reportHtml: html });
      await saveReport(currentRecordId, html);
    },
    [patchCurrentRecord, currentRecordId],
  );

  /**
   * Clear the report: patches local state to idle + calls DELETE /report.
   * Used for the "clear report" action (not for regeneration — use triggerRegenerate).
   */
  const clearReport = useCallback(() => {
    patchCurrentRecord({
      reportHtml:          undefined,
      reportSource:        undefined,
      reportGeneratedAt:   undefined,
      reportUpdatedAt:     undefined,
    });
    setHasError(false);
    clearExperimentReport(currentRecordId).catch((err) => {
      console.error("[report] clear failed:", err);
    });
  }, [patchCurrentRecord, currentRecordId, setHasError]);

  return {
    reportStatus,
    triggerReportGeneration,
    triggerRegenerate,
    commitReport,
    clearReport,
  };
}
