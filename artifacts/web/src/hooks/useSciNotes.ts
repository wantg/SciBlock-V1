import type { SciNote } from "@/types/scinote";
import { PLACEHOLDER_SCINOTES } from "@/data/scinotes";

export interface UseSciNotesResult {
  notes: SciNote[];
  loading: boolean;
}

// TODO: replace placeholder data with a real API call when the backend is ready.
export function useSciNotes(): UseSciNotesResult {
  return { notes: PLACEHOLDER_SCINOTES, loading: false };
}
