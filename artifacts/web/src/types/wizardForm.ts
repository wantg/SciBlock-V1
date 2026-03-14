import type { ExperimentField } from "./experimentFields";
import type { MeasurementItem, DataItem, OperationStep } from "./ontologyModules";

/**
 * Steps 2 and 3 share the same "configurable field groups" model (StepData).
 * Steps 4, 5, and 6 use dedicated per-item card models aligned with the workbench types.
 */

export interface StepData {
  fields: ExperimentField[];
}

export type Step2Data = StepData; // 实验系统
export type Step3Data = StepData; // 实验准备

/**
 * Step 4 — 实验操作 uses the same per-step card model as OperationStep.
 *
 * Write rule: new wizard UI writes ONLY to `items`.
 * `fields` is read-only compat for notes created before this change.
 * No new code should ever write to `fields`.
 *
 * order is stored on each OperationStep and auto-maintained by the editor
 * (index + 1 on create; renumbered on delete). No manual order input.
 */
export interface Step4Data {
  /** Canonical operation step list. Always written by the new Step 4 UI. */
  items: OperationStep[];
  /** Legacy field groups (old format). Read-only compat — never written by new code. */
  fields?: ExperimentField[];
}

/**
 * Step 6 — 实验数据 uses the same per-item card model as DataItem.
 *
 * Write rule: new wizard UI writes ONLY to `items`.
 * `fields` is read-only compat for notes created before this change.
 * No new code should ever write to `fields`.
 */
export interface Step6Data {
  /** Canonical data item list. Always written by the new Step 6 UI. */
  items: DataItem[];
  /** Legacy field groups (old format). Read-only compat — never written by new code. */
  fields?: ExperimentField[];
}

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
