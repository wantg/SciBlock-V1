import { useState } from "react";
import type { WizardFormData } from "@/types/wizardForm";

const INITIAL: WizardFormData = {
  step2: { experimentName: "", experimentType: "", goal: "" },
  step3: { materials: "", environment: "", estimatedTime: "" },
  step4: { operationSteps: "", cautions: "" },
  step5: { metrics: "", method: "", instruments: "" },
  step6: { recordingMethod: "", expectedResults: "" },
};

export interface UseWizardFormResult {
  data: WizardFormData;
  /**
   * Update one or more fields in a step.
   * Usage: patch('step2', { experimentName: 'foo' })
   */
  patch: <K extends keyof WizardFormData>(
    step: K,
    updates: Partial<WizardFormData[K]>,
  ) => void;
  /** True when the minimum required fields are filled */
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

  // Minimum condition: experiment name is filled (step 2).
  const canFinish = data.step2.experimentName.trim().length > 0;

  return { data, patch, canFinish, isAiFilled, populateFromAI };
}
