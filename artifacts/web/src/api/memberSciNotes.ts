/**
 * api/memberSciNotes.ts — REST client for instructor-only member data endpoints.
 *
 * Adapter rules (mirrors scinotes.ts):
 *   - ApiMemberSciNote is NOT exported (wire shape stays in this file).
 *   - normalizeMemberSciNote is NOT exported.
 *   - All public functions return the domain type SciNote or ExperimentRecord[].
 *
 * Routes (Go API, proxied via Express):
 *   GET /api/instructor/members/:userId/scinotes
 *   GET /api/instructor/members/:userId/scinotes/:sciNoteId/experiments
 *
 * :userId is the auth user ID (users.id / scinotes.user_id),
 * NOT the student profile ID (students.id).
 * Callers must supply student.userId, not student.id.
 *
 * These endpoints require instructor role; a student JWT will receive 403.
 */

import type { SciNote } from "@/types/scinote";
import type { WizardFormData } from "@/types/wizardForm";
import type { ExperimentRecord } from "@/types/workbench";
import { apiFetch } from "./client";
import { apiResponseToRecord, type ExperimentApiResponse } from "./experiments";

// ---------------------------------------------------------------------------
// Wire types — internal only
// ---------------------------------------------------------------------------

interface ApiMemberSciNote {
  id:             string;
  userId:         string;
  title:          string;
  kind:           string;
  experimentType: string | null;
  objective:      string | null;
  formData:       WizardFormData | null;
  createdAt:      string;
  updatedAt:      string;
}

interface ListMemberSciNotesResponse {
  items: ApiMemberSciNote[];
  total: number;
}

interface ListMemberExperimentsResponse {
  items: ExperimentApiResponse[];
  total: number;
}

// ---------------------------------------------------------------------------
// Normalize
// ---------------------------------------------------------------------------

function normalizeMemberSciNote(api: ApiMemberSciNote): SciNote {
  return {
    id:             api.id,
    title:          api.title,
    kind:           api.kind as SciNote["kind"],
    experimentType: api.experimentType ?? undefined,
    objective:      api.objective ?? undefined,
    formData:       api.formData ?? undefined,
    createdAt:      api.createdAt,
    updatedAt:      api.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Fetches all non-deleted SciNotes owned by a student.
 * @param userId  The student's auth user ID (student.userId, NOT student.id).
 */
export async function fetchMemberSciNotes(userId: string): Promise<SciNote[]> {
  const res = await apiFetch<ListMemberSciNotesResponse>(
    `/instructor/members/${encodeURIComponent(userId)}/scinotes`,
  );
  return (res.items ?? []).map(normalizeMemberSciNote);
}

/**
 * Fetches all non-deleted experiment records for a SciNote owned by a student.
 * @param userId     The student's auth user ID (student.userId, NOT student.id).
 * @param sciNoteId  The SciNote ID (must belong to this userId).
 */
export async function fetchMemberExperiments(
  userId:    string,
  sciNoteId: string,
): Promise<ExperimentRecord[]> {
  const res = await apiFetch<ListMemberExperimentsResponse>(
    `/instructor/members/${encodeURIComponent(userId)}/scinotes/${encodeURIComponent(sciNoteId)}/experiments`,
  );
  return (res.items ?? []).map(apiResponseToRecord);
}

/**
 * Fetches a single experiment record owned by a student.
 *
 * Backend performs a two-step ownership check:
 *   1. Load experiment by experimentId
 *   2. Load parent scinote and verify scinote.user_id == userId
 * A mismatched userId returns 403; a nonexistent experimentId returns 404.
 *
 * @param userId        The student's auth user ID (student.userId, NOT student.id).
 * @param experimentId  The experiment record ID.
 */
export async function fetchMemberExperiment(
  userId:       string,
  experimentId: string,
): Promise<ExperimentRecord> {
  const res = await apiFetch<ExperimentApiResponse>(
    `/instructor/members/${encodeURIComponent(userId)}/experiments/${encodeURIComponent(experimentId)}`,
  );
  return apiResponseToRecord(res);
}
