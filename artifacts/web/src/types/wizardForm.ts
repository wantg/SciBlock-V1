import type { ExperimentField } from "./experimentFields";
import type { MeasurementItem } from "./ontologyModules";

/**
 * Steps 2, 3, 4, 6 share the same "configurable field groups" model.
 * Step 5 intentionally diverges — see Step5Data below.
 */

export interface StepData {
  fields: ExperimentField[];
}

export type Step2Data = StepData; // 实验系统
export type Step3Data = StepData; // 实验准备
export type Step4Data = StepData; // 实验操作
export type Step6Data = StepData; // 实验数据

/**
 * Step 5 — 测量过程 uses a per-event card model aligned with MeasurementItem.
 *
 * Write rule:
 *   - New wizard UI writes ONLY to `items`.
 *   - `fields` is read-only compat for notes created before this change.
 *   - No new code should ever write to `fields`.
 *
 * Read rule in wizardToModules:
 *   - If `items` is present and non-empty → direct passthrough (perfect fidelity).
 *   - Else if `fields` is present → legacy best-effort mapping.
 */
export interface Step5Data {
  /** Canonical measurement item list. Always written by the new Step 5 UI. */
  items: MeasurementItem[];
  /** Legacy field groups (old format). Kept for backward compat — never written by new code. */
  fields?: ExperimentField[];
}

export interface WizardFormData {
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  step5: Step5Data;
  step6: Step6Data;
}
