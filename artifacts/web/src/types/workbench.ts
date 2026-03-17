// ---------------------------------------------------------------------------
// Ontology
// ---------------------------------------------------------------------------

export type OntologyModuleKey =
  | "system"
  | "preparation"
  | "operation"
  | "measurement"
  | "data";

export type OntologyModuleStatus = "inherited" | "confirmed";

export interface OntologyModule {
  key: OntologyModuleKey;
  title: string;
  /**
   * Structured domain entities for this module.
   * Undefined on legacy records that predate structured data.
   */
  structuredData?: import("./ontologyModules").OntologyModuleStructuredData;
  status: OntologyModuleStatus;
  isHighlighted: boolean;
  updatedAt: string;
}

export type OntologyVersionSource =
  | "initial_generated"
  | "initial_confirmed"
  | "experiment_confirmed";

export interface OntologyVersion {
  id: string;
  versionNumber: number;
  parentVersionId: string | null;
  source: OntologyVersionSource;
  modules: OntologyModule[];
  confirmedAt?: string;
}

// ---------------------------------------------------------------------------
// Experiment record
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
  /** Which ontology version this record inherited from */
  inheritedOntologyVersionId: string;
  /** Live working copy of modules — may diverge from the inherited version */
  currentModules: OntologyModule[];
  /** TipTap HTML content */
  editorContent: string;
  createdAt: string;
  /** Server-assigned last-modification timestamp. Used e.g. for deletedAt in trash. */
  updatedAt?: string;
  /**
   * AI-generated experiment report HTML.
   * Persisted to sessionStorage alongside the rest of the record.
   * Undefined until all five modules are confirmed and the report is generated.
   */
  reportHtml?: string;
}

// ---------------------------------------------------------------------------
// AI title assist
// ---------------------------------------------------------------------------

export interface PurposeAssistResult {
  generatedTitle: string;
  purposeDraft: string;
  highlightedModuleKeys: OntologyModuleKey[];
}

// ---------------------------------------------------------------------------
// UI / Layout
// ---------------------------------------------------------------------------

export type WorkbenchFocusMode = "balanced" | "editor" | "ontology";

/** The 4 modules that trigger flow-draft generation when all confirmed. */
export const FLOW_TRIGGER_KEYS: OntologyModuleKey[] = [
  "system",
  "preparation",
  "operation",
  "measurement",
];

/** All 5 modules — must all be confirmed to trigger AI report generation. */
export const ALL_MODULE_KEYS: OntologyModuleKey[] = [
  "system",
  "preparation",
  "operation",
  "measurement",
  "data",
];
