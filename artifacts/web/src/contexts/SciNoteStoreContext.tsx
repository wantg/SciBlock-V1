import React, { createContext, useContext, useState, useEffect } from "react";
import type { SciNote } from "@/types/scinote";
import type { WizardFormData } from "@/types/wizardForm";
import { getExperimentName } from "@/types/experimentFields";
import { loadSciNotes, saveSciNotes } from "@/data/scinoteStorage";
import { clearWorkbenchRecords } from "@/data/workbenchStorage";

/**
 * SciNoteStoreContext — manages the personal SciNote list.
 *
 * Persistence:  SciNote list → localStorage via scinoteStorage (survives refresh).
 * Cleanup hook: deleteSciNote also clears workbench sessionStorage for the
 *               deleted note so orphaned records don't accumulate.
 *
 * Dependency rule: this context imports from data/ only.
 *                  It must NOT import from WorkbenchContext or TrashContext.
 */

interface SciNoteStoreContextValue {
  notes: SciNote[];
  /** Create a new SciNote from wizard form data. Returns the new id. */
  createSciNote: (formData: WizardFormData) => string;
  /**
   * Rename an existing SciNote container.
   * Only title changes — formData is untouched.
   */
  renameSciNote: (id: string, newTitle: string) => void;
  /**
   * Overwrite the formData of an existing SciNote with fresh wizard output.
   * The note's id, title, kind, and createdAt are all preserved.
   */
  reinitializeSciNote: (id: string, newFormData: WizardFormData) => void;
  /** Permanently remove a SciNote and clean up its workbench records. */
  deleteSciNote: (id: string) => void;
}

const SciNoteStoreContext = createContext<SciNoteStoreContextValue | null>(null);

export function SciNoteStoreProvider({ children }: { children: React.ReactNode }) {
  /**
   * Load initial notes from localStorage on first mount.
   * Falls back to PLACEHOLDER_SCINOTES when no saved data exists.
   */
  const [notes, setNotes] = useState<SciNote[]>(loadSciNotes);

  /**
   * Persist the SciNote list to localStorage whenever it changes.
   * This is the only write path — all mutations go through setNotes.
   */
  useEffect(() => {
    saveSciNotes(notes);
  }, [notes]);

  function createSciNote(formData: WizardFormData): string {
    const id = `exp-${Date.now()}`;
    const newNote: SciNote = {
      id,
      title: getExperimentName(formData.step2.fields) || "未命名实验",
      kind: "wizard",
      createdAt: new Date().toISOString(),
      formData,
    };
    setNotes((prev) => [newNote, ...prev]);
    return id;
  }

  function renameSciNote(id: string, newTitle: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title: newTitle } : n)),
    );
  }

  function reinitializeSciNote(id: string, newFormData: WizardFormData) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              formData: newFormData,
              kind: "wizard",
            }
          : n,
      ),
    );
  }

  function deleteSciNote(id: string) {
    // Remove the SciNote from the list (triggers persistence via useEffect).
    setNotes((prev) => prev.filter((n) => n.id !== id));
    // Clean up the orphaned workbench session data for this SciNote.
    // This call is safe here: clearWorkbenchRecords is a pure data-layer
    // function — it does not import any context or React code.
    clearWorkbenchRecords(id);
  }

  return (
    <SciNoteStoreContext.Provider
      value={{ notes, createSciNote, renameSciNote, reinitializeSciNote, deleteSciNote }}
    >
      {children}
    </SciNoteStoreContext.Provider>
  );
}

export function useSciNoteStore(): SciNoteStoreContextValue {
  const ctx = useContext(SciNoteStoreContext);
  if (!ctx) {
    throw new Error("useSciNoteStore must be used inside SciNoteStoreProvider");
  }
  return ctx;
}
