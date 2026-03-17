import { apiFetch } from "./client";
import type {
  ExperimentRecord,
  ExperimentStatus,
  OntologyModule,
} from "@/types/workbench";

// ---------------------------------------------------------------------------
// Wire types (Go API shapes) — internal to this adapter.
// Do not export these — callers receive ExperimentRecord (domain type) only.
// ---------------------------------------------------------------------------

interface ExperimentApiResponse {
  id: string;
  sciNoteId: string;
  title: string;
  purposeInput: string | null;
  experimentStatus: string;
  experimentCode: string;
  tags: string[];
  editorContent: string;
  reportHtml: string | null;
  currentModules: OntologyModule[] | null;
  inheritedVersionId: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListExperimentsResponse {
  items: ExperimentApiResponse[];
  total: number;
}

/** Domain-typed response returned by listExperiments. Wire types do not escape this module. */
export interface ListExperimentsResult {
  items: ExperimentRecord[];
  total: number;
}

export interface CreateExperimentRequest {
  title?: string;
  purposeInput?: string;
  experimentStatus?: string;
  experimentCode?: string;
  tags?: string[];
  currentModules?: OntologyModule[];
  inheritedVersionId?: string;
}

export interface UpdateExperimentRequest {
  title?: string;
  experimentStatus?: string;
  experimentCode?: string;
  tags?: string[];
  editorContent?: string;
  reportHtml?: string;
  currentModules?: OntologyModule[];
}

// ---------------------------------------------------------------------------
// Mapping: API response → ExperimentRecord
// ---------------------------------------------------------------------------

export function apiResponseToRecord(api: ExperimentApiResponse): ExperimentRecord {
  return {
    id: api.id,
    sciNoteId: api.sciNoteId,
    title: api.title,
    purposeInput: api.purposeInput ?? undefined,
    experimentStatus: (api.experimentStatus as ExperimentStatus) || "探索中",
    experimentCode: api.experimentCode,
    tags: api.tags ?? [],
    inheritedOntologyVersionId: api.inheritedVersionId ?? "wizard_generated",
    currentModules: api.currentModules ?? [],
    editorContent: api.editorContent ?? "",
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    reportHtml: api.reportHtml ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listExperiments(
  sciNoteId: string,
  opts?: { deletedOnly?: boolean },
): Promise<ListExperimentsResult> {
  const params = opts?.deletedOnly ? "?deleted=true" : "";
  const raw = await apiFetch<ListExperimentsResponse>(
    `/scinotes/${sciNoteId}/experiments${params}`,
  );
  return { items: raw.items.map(apiResponseToRecord), total: raw.total };
}

export async function createExperiment(
  sciNoteId: string,
  req: CreateExperimentRequest,
): Promise<ExperimentRecord> {
  const resp = await apiFetch<ExperimentApiResponse>(
    `/scinotes/${sciNoteId}/experiments`,
    {
      method: "POST",
      body: JSON.stringify(req),
    },
  );
  return apiResponseToRecord(resp);
}

export async function getExperiment(id: string): Promise<ExperimentRecord> {
  const resp = await apiFetch<ExperimentApiResponse>(`/experiments/${id}`);
  return apiResponseToRecord(resp);
}

export async function updateExperiment(
  id: string,
  req: UpdateExperimentRequest,
): Promise<ExperimentRecord> {
  const resp = await apiFetch<ExperimentApiResponse>(`/experiments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
  return apiResponseToRecord(resp);
}

export async function deleteExperiment(id: string): Promise<void> {
  await apiFetch<unknown>(`/experiments/${id}`, { method: "DELETE" });
}

export async function restoreExperiment(id: string): Promise<ExperimentRecord> {
  const resp = await apiFetch<ExperimentApiResponse>(
    `/experiments/${id}/restore`,
    { method: "PATCH" },
  );
  return apiResponseToRecord(resp);
}
