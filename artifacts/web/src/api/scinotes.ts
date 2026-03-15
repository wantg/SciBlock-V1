/**
 * api/scinotes.ts — REST client for the SciNote CRUD endpoints.
 *
 * All calls proxy through Express → Go API.
 * The Bearer token is injected automatically by apiFetch via localStorage.
 */

import type { WizardFormData } from "@/types/wizardForm";
import { apiFetch } from "./client";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** Canonical SciNote shape returned by the Go API. */
export interface ApiSciNote {
  id: string;
  userId: string;
  title: string;
  kind: string;
  experimentType: string | null;
  objective: string | null;
  formData: WizardFormData | null;
  createdAt: string;
  updatedAt: string;
}

interface ListSciNotesResponse {
  items: ApiSciNote[];
  total: number;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** GET /api/scinotes — list all non-deleted SciNotes for the current user. */
export function listSciNotes(): Promise<ListSciNotesResponse> {
  return apiFetch<ListSciNotesResponse>("/scinotes");
}

/** GET /api/scinotes/:id — fetch a single SciNote. */
export function getSciNote(id: string): Promise<ApiSciNote> {
  return apiFetch<ApiSciNote>(`/scinotes/${id}`);
}

/** POST /api/scinotes — create a new SciNote. */
export function createSciNoteApi(body: {
  title: string;
  kind: string;
  experimentType?: string;
  objective?: string;
  formData?: WizardFormData;
}): Promise<ApiSciNote> {
  return apiFetch<ApiSciNote>("/scinotes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PATCH /api/scinotes/:id — partial update (all fields optional). */
export function updateSciNote(
  id: string,
  patch: {
    title?: string;
    experimentType?: string;
    objective?: string;
    formData?: WizardFormData;
  },
): Promise<ApiSciNote> {
  return apiFetch<ApiSciNote>(`/scinotes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** DELETE /api/scinotes/:id — soft-delete (moves to trash). */
export function deleteSciNoteApi(id: string): Promise<void> {
  return apiFetch<void>(`/scinotes/${id}`, { method: "DELETE" });
}
