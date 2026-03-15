import type { SciNote } from "@/types/scinote";

/**
 * Persistence layer for the SciNote list (personal module).
 *
 * Storage: localStorage — persists across browser sessions and page refreshes.
 * Key namespace: "sciblock:scinotes" — separate from workbench record keys.
 *
 * This file is the single authoritative source for SciNote list I/O.
 * SciNoteStoreContext reads from and writes to these helpers.
 * WorkbenchContext must never import from this file (one-way dependency).
 *
 * NOTE: loadSciNotes returns [] when localStorage is empty or corrupt.
 *       There is no placeholder/demo fallback — an empty result means the
 *       user has no SciNotes yet. SciNoteStoreContext populates the list
 *       from the API on mount.
 */

const SCINOTE_KEY = "sciblock:scinotes";

/**
 * Load the saved SciNote list from localStorage.
 * Returns [] if nothing is stored yet or if the stored data is corrupt.
 * Never returns placeholder or demo data.
 */
export function loadSciNotes(): SciNote[] {
  try {
    const raw = localStorage.getItem(SCINOTE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SciNote[];
  } catch {
    return [];
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
