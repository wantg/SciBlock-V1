import type { ExperimentRecord, ExperimentStatus } from "@/types/workbench";

// ---------------------------------------------------------------------------
// DeletedRecord — snapshot of an ExperimentRecord when moved to trash.
//
// Stored separately from active records in TrashContext.
// Restoring a record removes it from trash and returns it via
// TrashContext.getRestoredForSciNote() so WorkbenchProvider can re-seed it.
// ---------------------------------------------------------------------------

export interface DeletedRecord {
  /** Full snapshot of the record at the moment it was trashed. */
  record: ExperimentRecord;

  /** The SciNote this record belonged to. */
  sciNoteId: string;

  /** Snapshot of the SciNote title at deletion time (persists even if SciNote is renamed). */
  sciNoteTitle: string;

  /** ISO timestamp of when the record was trashed. */
  deletedAt: string;

  /** Snapshot of the experiment status badge at deletion time. */
  statusAtDeletion: ExperimentStatus;
}
