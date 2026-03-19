import { apiFetch } from "./client";
import type {
  ExperimentRecord,
  ExperimentStatus,
  OntologyModule,
  ConfirmationState,
  DerivedFromSourceType,
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
  // Phase 2 report metadata
  reportSource: string | null;
  reportGeneratedAt: string | null;
  reportUpdatedAt: string | null;
  currentModules: OntologyModule[] | null;
  inheritedVersionId: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Inheritance-chain fields
  sequenceNumber: number;
  confirmationState: ConfirmationState;
  confirmedAt: string | null;
  derivedFromSourceType: DerivedFromSourceType;
  derivedFromRecordId: string | null;
  derivedFromRecordSeq: number | null;
  derivedFromContextVer: number;
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
    reportSource: api.reportSource ?? undefined,
    reportGeneratedAt: api.reportGeneratedAt ?? undefined,
    reportUpdatedAt: api.reportUpdatedAt ?? undefined,
    // Inheritance-chain fields
    sequenceNumber: api.sequenceNumber ?? 1,
    confirmationState: api.confirmationState ?? "draft",
    confirmedAt: api.confirmedAt ?? undefined,
    derivedFromSourceType: api.derivedFromSourceType ?? "initial",
    derivedFromRecordId: api.derivedFromRecordId ?? undefined,
    derivedFromRecordSeq: api.derivedFromRecordSeq ?? undefined,
    derivedFromContextVer: api.derivedFromContextVer ?? 0,
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

/**
 * confirmExperiment — executes the confirm-save workflow for an experiment record.
 *
 * The server:
 *   1. Extracts heritable modules from the record's current state.
 *   2. Snapshots them into confirmed_modules.
 *   3. If this record is the chain head, advances the SciNote's inheritance context.
 *   4. Returns the updated record (confirmationState = "confirmed").
 *
 * No request body is needed — the server reads the current record state.
 */
export async function confirmExperiment(id: string): Promise<ExperimentRecord> {
  const resp = await apiFetch<ExperimentApiResponse>(
    `/experiments/${id}/confirm`,
    { method: "POST" },
  );
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

// ---------------------------------------------------------------------------
// Report API (Phase 2)
// ---------------------------------------------------------------------------

interface GenerateReportResponse {
  html: string;
  source: "ai" | "stub";
  generatedAt: string;
}

/**
 * Trigger AI-powered report generation for an experiment.
 * The backend reads experiment + scinote data from the DB, calls the AI,
 * persists the result, and returns the rendered HTML.
 *
 * @returns The generated HTML string (already persisted server-side).
 */
export async function generateReport(experimentId: string): Promise<string> {
  const resp = await apiFetch<GenerateReportResponse>(
    `/experiments/${experimentId}/report/generate`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return resp.html;
}

/**
 * Persist a manually edited report HTML.
 * Sets report_source = 'manual' on the server.
 */
export async function saveReport(experimentId: string, html: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/experiments/${experimentId}/report`,
    { method: "PUT", body: JSON.stringify({ html }) },
  );
}

/**
 * Clear all report fields, resetting the experiment to idle report status.
 */
export async function clearExperimentReport(experimentId: string): Promise<void> {
  await apiFetch<unknown>(
    `/experiments/${experimentId}/report`,
    { method: "DELETE" },
  );
}
