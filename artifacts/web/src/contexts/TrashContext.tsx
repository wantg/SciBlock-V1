import React, { createContext, useContext, useState } from "react";
import type { ExperimentRecord } from "@/types/workbench";
import type { DeletedRecord } from "@/types/trash";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface TrashContextValue {
  /** Records currently in the trash (soft-deleted). */
  trashedRecords: DeletedRecord[];

  /**
   * Move an active experiment record into the trash.
   * Called by WorkbenchContext.moveToTrash() after guards pass.
   */
  moveToTrash: (
    record: ExperimentRecord,
    sciNoteId: string,
    sciNoteTitle: string,
  ) => void;

  /**
   * Restore a trashed record.
   * Removes it from trash and places it in the restoredRecords pool.
   * WorkbenchProvider picks it up via getRestoredForSciNote() on next mount.
   */
  restoreRecord: (recordId: string) => void;

  /**
   * Permanently destroy a trashed record.
   * Removes it from trash; does NOT touch ontologyVersions.
   */
  permanentlyDelete: (recordId: string) => void;

  /**
   * Returns records that have been restored for a given SciNote.
   * WorkbenchProvider passes these as extraRecords on mount so restored
   * records reappear in the workbench without additional round-trips.
   */
  getRestoredForSciNote: (sciNoteId: string) => ExperimentRecord[];
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TrashContext = createContext<TrashContextValue | null>(null);

export function useTrash(): TrashContextValue {
  const ctx = useContext(TrashContext);
  if (!ctx) throw new Error("useTrash must be used inside TrashProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TrashProvider({ children }: { children: React.ReactNode }) {
  const [trashedRecords, setTrashedRecords] = useState<DeletedRecord[]>([]);

  /**
   * restoredPool: records removed from trash, grouped by sciNoteId.
   * WorkbenchProvider reads this to reinsert restored records on mount.
   */
  const [restoredPool, setRestoredPool] = useState<
    Record<string, ExperimentRecord[]>
  >({});

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function moveToTrash(
    record: ExperimentRecord,
    sciNoteId: string,
    sciNoteTitle: string,
  ) {
    const entry: DeletedRecord = {
      record,
      sciNoteId,
      sciNoteTitle,
      deletedAt: new Date().toISOString(),
      statusAtDeletion: record.experimentStatus,
    };
    setTrashedRecords((prev) => [entry, ...prev]);
  }

  function restoreRecord(recordId: string) {
    const entry = trashedRecords.find((d) => d.record.id === recordId);
    if (!entry) return;

    // Remove from trash
    setTrashedRecords((prev) => prev.filter((d) => d.record.id !== recordId));

    // Add to the restored pool for the originating SciNote
    setRestoredPool((prev) => ({
      ...prev,
      [entry.sciNoteId]: [...(prev[entry.sciNoteId] ?? []), entry.record],
    }));
  }

  function permanentlyDelete(recordId: string) {
    // Simply remove from trash — ontologyVersions are never touched.
    setTrashedRecords((prev) => prev.filter((d) => d.record.id !== recordId));
  }

  function getRestoredForSciNote(sciNoteId: string): ExperimentRecord[] {
    return restoredPool[sciNoteId] ?? [];
  }

  // ---------------------------------------------------------------------------
  // Value
  // ---------------------------------------------------------------------------

  return (
    <TrashContext.Provider
      value={{
        trashedRecords,
        moveToTrash,
        restoreRecord,
        permanentlyDelete,
        getRestoredForSciNote,
      }}
    >
      {children}
    </TrashContext.Provider>
  );
}
