import type { WizardFormData } from "./wizardForm";

export interface SciNote {
  id: string;
  title: string;
  /**
   * "placeholder" — static seed data loaded on startup
   * "wizard"      — created via the experiment initialization wizard
   */
  kind: "placeholder" | "wizard";
  createdAt?: string;
  updatedAt?: string;
  /** Populated only for wizard-created notes */
  formData?: WizardFormData;

  // ---------------------------------------------------------------------------
  // Experiment-level metadata — elevated from Step 2 (实验类型, 实验目标).
  // These are SciNote-level properties shared by all ExperimentRecords under
  // this note.  They are NOT stored inside OntologyModule["system"].
  //
  // title (实验名称) already lives on SciNote directly — no change needed there.
  // ---------------------------------------------------------------------------

  /** 实验类型 — e.g. "材料性能测试" | "催化研究" | "光学表征". Undefined for pre-upgrade notes. */
  experimentType?: string;
  /** 实验目标 — the research objective stated in the initialization wizard. */
  objective?: string;

  // ---------------------------------------------------------------------------
  // Instructor-only computed field — populated only by the
  // GET /api/instructor/members/:userId/scinotes endpoint.
  // Undefined when loaded via the student's own /api/scinotes endpoint.
  // ---------------------------------------------------------------------------

  /** Number of non-deleted experiment records under this SciNote. */
  experimentCount?: number;
}
