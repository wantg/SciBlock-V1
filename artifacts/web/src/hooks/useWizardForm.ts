import { useState } from "react";
import type { WizardFormData } from "@/types/wizardForm";
import { getExperimentName } from "@/types/experimentFields";
import {
  DEFAULT_STEP2_FIELDS,
  DEFAULT_STEP3_FIELDS,
} from "@/data/defaultStepFields";

const INITIAL: WizardFormData = {
  step2: { fields: DEFAULT_STEP2_FIELDS },
  step3: { fields: DEFAULT_STEP3_FIELDS },
  // Step 4 uses the OperationStep card model — starts empty, written only to items[].
  step4: { items: [] },
  // Step 5 uses the MeasurementItem card model — starts empty, written only to items[].
  step5: { items: [] },
  // Step 6 uses the DataItem card model — starts empty, written only to items[].
  step6: { items: [] },
};

export interface UseWizardFormResult {
  data: WizardFormData;
  /**
   * Update one or more fields in a step.
   * Usage: patch('step2', { fields: updatedFields })
   */
  patch: <K extends keyof WizardFormData>(
    step: K,
    updates: Partial<WizardFormData[K]>,
  ) => void;
  /** True when the minimum required fields are filled (实验名称 must be non-empty) */
  canFinish: boolean;
  /** True after AI mock data has been injected via populateFromAI */
  isAiFilled: boolean;
  /** Replace the entire form dataset with AI-generated content */
  populateFromAI: (fill: WizardFormData) => void;
}

export function useWizardForm(): UseWizardFormResult {
  const [data, setData] = useState<WizardFormData>(INITIAL);
  const [isAiFilled, setIsAiFilled] = useState(false);

  function patch<K extends keyof WizardFormData>(
    step: K,
    updates: Partial<WizardFormData[K]>,
  ) {
    setData((prev) => ({
      ...prev,
      [step]: { ...prev[step], ...updates },
    }));
  }

  function populateFromAI(fill: WizardFormData) {
    setData(fill);
    setIsAiFilled(true);
  }

  // Minimum condition: 实验名称 field must have a non-empty value.
  const canFinish = getExperimentName(data.step2.fields).length > 0;

  return { data, patch, canFinish, isAiFilled, populateFromAI };
}
