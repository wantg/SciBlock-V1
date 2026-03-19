/**
 * useExperimentReport — encapsulates manual report generation state and actions.
 *
 * Layer: Business logic hook (no UI, no direct context access).
 *
 * Phase 1 of the WorkbenchContext report extraction. This hook owns the logic
 * for the *manual* report generation path:
 *   - reportStatus derivation
 *   - triggerReportGeneration (manual button click)
 *   - updateReport (user-edited report HTML)
 *   - clearReport (reset to idle)
 *
 * The *automatic* trigger path (all 5 modules confirmed → auto-generate) is
 * intentionally left inside setModuleStatus() in WorkbenchContext and will be
 * addressed in Phase 2. To share state ownership, WorkbenchContext holds the
 * isGenerating / hasError state variables and passes them here as params —
 * this keeps setModuleStatus's direct setState calls working without change.
 *
 * Consumer: WorkbenchContext (spreads the returned value into context value).
 */

import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ExperimentRecord } from "@/types/workbench";
import type { ReportStatus } from "@/types/report";
import {
  generateReport,
  saveReport,
  clearExperimentReport,
} from "@/api/experiments";

const SAVE_DEBOUNCE_MS = 2_000;

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
   * directly without being refactored in Phase 1.
   */
  isGenerating:       boolean;
  hasError:           boolean;
  setIsGenerating:    Dispatch<SetStateAction<boolean>>;
  setHasError:        Dispatch<SetStateAction<boolean>>;
  /** Full records setter — triggerReportGeneration writes reportHtml via functional update. */
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
  /** Manually trigger report generation (e.g. after partial confirm or retry). */
  triggerReportGeneration: () => void;
  /** Persist user-edited report HTML back to the record. */
  updateReport:            (html: string) => void;
  /** Clear the generated report (reset to idle). */
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

  // Timer ref for debounced backend save (survives re-renders, never triggers re-render).
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Derive reportStatus — no memo needed, values are primitives / object ref.
  const reportStatus: ReportStatus =
    isGenerating      ? "generating"
    : hasError        ? "error"
    : currentRecord.reportHtml ? "ready"
    : "idle";

  /**
   * Manual trigger: user clicks "重新生成" or the retry button.
   * Calls the backend AI generation endpoint; result is persisted server-side,
   * then patched into local state.
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
   * Update report HTML locally (immediate) then debounce the backend PUT save.
   * Called on every TipTap content change — must not block the UI.
   */
  const updateReport = useCallback(
    (html: string) => {
      patchCurrentRecord({ reportHtml: html });
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveReport(currentRecordId, html).catch((err) => {
          console.error("[report] debounced save failed:", err);
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [patchCurrentRecord, currentRecordId],
  );

  /**
   * Clear the report locally and on the backend (DELETE).
   */
  const clearReport = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    patchCurrentRecord({
      reportHtml: undefined,
      reportSource: undefined,
      reportGeneratedAt: undefined,
      reportUpdatedAt: undefined,
    });
    setHasError(false);
    clearExperimentReport(currentRecordId).catch((err) => {
      console.error("[report] clear failed:", err);
    });
  }, [patchCurrentRecord, currentRecordId, setHasError]);

  return { reportStatus, triggerReportGeneration, updateReport, clearReport };
}
