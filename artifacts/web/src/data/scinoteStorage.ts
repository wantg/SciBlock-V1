import type { SciNote } from "@/types/scinote";
import { PLACEHOLDER_SCINOTES } from "@/data/scinotes";

/**
 * Persistence layer for the SciNote list (personal module).
 *
 * Storage: localStorage — persists across browser sessions and page refreshes.
 * Key namespace: "sciblock:scinotes" — separate from workbench record keys.
 *
 * This file is the single authoritative source for SciNote list I/O.
 * SciNoteStoreContext reads from and writes to these helpers.
 * WorkbenchContext must never import from this file (one-way dependency).
 */

const SCINOTE_KEY = "sciblock:scinotes";

/**
 * Load the saved SciNote list from localStorage.
 * Falls back to PLACEHOLDER_SCINOTES if nothing is stored yet
 * (genuine first launch) or if the stored data is corrupt.
 */
export function loadSciNotes(): SciNote[] {
  try {
    const raw = localStorage.getItem(SCINOTE_KEY);
    if (!raw) return PLACEHOLDER_SCINOTES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return PLACEHOLDER_SCINOTES;
    return parsed as SciNote[];
  } catch {
    return PLACEHOLDER_SCINOTES;
  }
}

/**
 * Persist the SciNote list to localStorage.
 * Called from SciNoteStoreContext's useEffect whenever notes change.
 */
export function saveSciNotes(notes: SciNote[]): void {
  try {
    localStorage.setItem(SCINOTE_KEY, JSON.stringify(notes));
  } catch {
    // localStorage unavailable (private mode, quota exceeded, etc.)
  }
}
