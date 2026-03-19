/**
 * experiment.ts — domain types for ExperimentRecord and its lifecycle.
 *
 * Layer: types (pure data contracts, no runtime logic)
 *
 * Scope:
 *   - ExperimentRecord entity + all its lifecycle / chain fields
 *   - ConfirmationState, DerivedFromSourceType, ExperimentStatus enums
 *   - Wizard / new-experiment-flow types (WizardStep, StepAiStatus, etc.)
 *
 * Ontology UI model types (OntologyModule, OntologyVersion, etc.) live in
 * types/workbench.ts because they belong to the workbench UI layer.
 */

// ---------------------------------------------------------------------------
// Wizard / new-experiment-flow types
// ---------------------------------------------------------------------------

export interface WizardStep {
  id: number;
  label: string;
}

/**
 * AI analysis / generation status for an individual wizard step.
 *
 * "idle"       — not yet touched by AI (default)
 * "processing" — AI is currently analyzing / generating content for this step
 * "generated"  — content has been auto-generated; user has not yet reviewed it
 * "reviewed"   — user navigated to this step after AI generation
 *
 * State machine (one-way):
 *   idle → processing → generated → reviewed
 */
export type StepAiStatus = "idle" | "processing" | "generated" | "reviewed";

/** Immutable map from stepId → StepAiStatus */
export type StepAiStatusMap = ReadonlyMap<number, StepAiStatus>;

export type FileStatus = "pending" | "analyzing" | "done";

export interface ImportedFile {
  id: string;
  name: string;
  fileType: string;   // e.g. "PDF", "DOCX"
  size: string;       // human-readable
  importedAt: string; // display string, e.g. "14:32"
  status: FileStatus;
}

// ---------------------------------------------------------------------------
// ExperimentRecord — confirmation chain fields
// ---------------------------------------------------------------------------

/**
 * Three-state lifecycle of an ExperimentRecord.
 * Managed exclusively by the server; the frontend treats this as read-only.
 *
 *   draft           — created, never confirm-saved.
 *   confirmed       — confirm-saved at least once; heritable modules are locked in.
 *   confirmed_dirty — confirmed previously, but modules edited since last confirm.
 */
export type ConfirmationState = "draft" | "confirmed" | "confirmed_dirty";

/**
 * Whether a record's heritable defaults came from the SciNote's immutable
 * initial_modules ("initial") or from a prior confirmed record ("record").
 */
export type DerivedFromSourceType = "initial" | "record";

// ---------------------------------------------------------------------------
// ExperimentRecord entity
// ---------------------------------------------------------------------------

export type ExperimentStatus = "探索中" | "可复现" | "失败" | "已验证";

export const EXPERIMENT_STATUS_OPTIONS: ExperimentStatus[] = [
  "探索中",
  "可复现",
  "失败",
  "已验证",
];

export interface ExperimentRecord {
  id: string;
  sciNoteId: string;
  title: string;
  purposeInput?: string;
  experimentStatus: ExperimentStatus;
  experimentCode: string;
  tags: string[];
  /** Which ontology version this record inherited from (legacy / forward-ref field) */
  inheritedOntologyVersionId: string;
  /** Live working copy of modules — may diverge from the inherited version */
  currentModules: import("./workbench").OntologyModule[];
  /** TipTap HTML content */
  editorContent: string;
  createdAt: string;
  /** Server-assigned last-modification timestamp. Used e.g. for deletedAt in trash. */
  updatedAt?: string;
  /**
   * AI-generated experiment report HTML.
   * Phase 1: locally generated (stub).
   * Phase 2+: server-persisted via POST /api/experiments/:id/report/generate.
   * Undefined until all five modules are confirmed and the report is generated.
   */
  reportHtml?: string;

  /**
   * Who/what produced the current reportHtml.
   * "stub"   → Phase-1 local rule-based generation (legacy, may exist in DB)
   * "ai"     → Phase-2 server-side AI generation
   * "manual" → user edited and explicitly saved the report
   * undefined → no report exists yet
   */
  reportSource?: string;

  /**
   * ISO timestamp when the report was first generated (generate endpoint sets this).
   * Undefined until first generation.
   */
  reportGeneratedAt?: string;

  /**
   * ISO timestamp of the last save (generation or manual edit).
   * Undefined until first report save.
   */
  reportUpdatedAt?: string;

  // ---------------------------------------------------------------------------
  // Inheritance-chain fields (server-assigned; read-only in frontend)
  // ---------------------------------------------------------------------------

  /** 1-based ordinal position of this record within its SciNote. */
  sequenceNumber: number;

  /** Confirmation lifecycle state. Managed by the server. */
  confirmationState: ConfirmationState;

  /** ISO timestamp of the most recent confirm-save action. Undefined until first confirm. */
  confirmedAt?: string;

  /**
   * Where this record's heritable defaults came from.
   * "initial"  → seeded from the SciNote's wizard initialization modules.
   * "record"   → inherited from the last confirmed record in the chain.
   */
  derivedFromSourceType: DerivedFromSourceType;

  /**
   * The sequence_number of the record this record inherited from.
   * Undefined when derivedFromSourceType === "initial".
   * Used for the banner: "已继承第N条确认保存的记录"
   */
  derivedFromRecordSeq?: number;

  /**
   * The ID of the record this record inherited from.
   * Undefined when derivedFromSourceType === "initial".
   */
  derivedFromRecordId?: string;

  /** context_version of the parent SciNote at creation time (audit field). */
  derivedFromContextVer: number;
}

// ---------------------------------------------------------------------------
// AI title assist
// ---------------------------------------------------------------------------

export interface PurposeAssistResult {
  generatedTitle: string;
  purposeDraft: string;
  highlightedModuleKeys: import("./workbench").OntologyModuleKey[];
}
