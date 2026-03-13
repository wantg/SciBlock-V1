import type { ExperimentField } from "@/types/experimentFields";

/**
 * Default field categories shown in Step 2 when the user chooses the manual-fill path.
 * AI-generated content replaces this entire list via populateFromAI.
 */
export const DEFAULT_STEP2_FIELDS: ExperimentField[] = [
  { id: "default-1", name: "实验名称", type: "text", value: "", items: [], objects: [] },
  { id: "default-2", name: "实验类型", type: "text", value: "", items: [], objects: [] },
  { id: "default-3", name: "实验目标", type: "text", value: "", items: [], objects: [] },
];
