import type { ExperimentRecord } from "@/types/workbench";

/**
 * Persistence layer for workbench experiment records.
 *
 * Storage: sessionStorage — tab-scoped, survives page refresh but not tab close.
 * Key namespace: "sciblock:workbench:<sciNoteId>" — one entry per SciNote.
 *
 * This file is the single authoritative source for workbench record I/O.
 * WorkbenchContext reads from and writes to these helpers.
 * SciNoteStoreContext calls clearWorkbenchRecords() when deleting a SciNote
 * so orphaned workbench data is cleaned up immediately.
 */

const workbenchKey = (sciNoteId: string): string =>
  `sciblock:workbench:${sciNoteId}`;

/**
 * Load persisted records for a SciNote from sessionStorage.
 * Returns [] when nothing is stored or the stored data is corrupt.
 */
export function loadWorkbenchRecords(sciNoteId: string): ExperimentRecord[] {
  try {
    const raw = sessionStorage.getItem(workbenchKey(sciNoteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ExperimentRecord[];
  } catch {
    return [];
  }
}

/**
 * Save the current records list for a SciNote to sessionStorage.
 * Called from WorkbenchContext's useEffect on every records change.
 */
export function saveWorkbenchRecords(
  sciNoteId: string,
  records: ExperimentRecord[],
): void {
  try {
    sessionStorage.setItem(workbenchKey(sciNoteId), JSON.stringify(records));
  } catch {
    // sessionStorage unavailable (private mode, quota exceeded, etc.)
  }
}

/**
 * Remove the workbench storage entry for a SciNote.
 * Called by SciNoteStoreContext when a SciNote is permanently deleted,
 * so orphaned session data is cleaned up without requiring a workbench mount.
 */
export function clearWorkbenchRecords(sciNoteId: string): void {
  try {
    sessionStorage.removeItem(workbenchKey(sciNoteId));
  } catch {
    // sessionStorage unavailable
  }
}
