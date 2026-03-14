import type { ExperimentField } from "@/types/experimentFields";

/**
 * Default field categories for each wizard step (manual-fill path).
 * IDs are stable strings (not random) so React keys are consistent on first render.
 * AI-extracted content replaces these arrays entirely via populateFromAI().
 */

// ---------------------------------------------------------------------------
// Step 2 — 实验系统
// ---------------------------------------------------------------------------
export const DEFAULT_STEP2_FIELDS: ExperimentField[] = [
  { id: "s2-1", name: "实验名称", type: "text",   value: "", items: [], objects: [] },
  { id: "s2-2", name: "实验类型", type: "text",   value: "", items: [], objects: [] },
  { id: "s2-3", name: "实验目标", type: "text",   value: "", items: [], objects: [] },
];

// ---------------------------------------------------------------------------
// Step 3 — 实验准备
// ---------------------------------------------------------------------------
export const DEFAULT_STEP3_FIELDS: ExperimentField[] = [
  { id: "s3-1", name: "准备材料", type: "object", value: "", items: [], objects: [] },
  { id: "s3-2", name: "准备设备", type: "object", value: "", items: [], objects: [] },
  { id: "s3-3", name: "环境条件", type: "object", value: "", items: [], objects: [] },
  { id: "s3-4", name: "前处理事项", type: "list", value: "", items: [], objects: [] },
];

// ---------------------------------------------------------------------------
// Step 4 — 实验操作
// ---------------------------------------------------------------------------
export const DEFAULT_STEP4_FIELDS: ExperimentField[] = [
  { id: "s4-1", name: "操作步骤", type: "object", value: "", items: [], objects: [] },
  { id: "s4-2", name: "安全注意事项", type: "list", value: "", items: [], objects: [] },
];

// ---------------------------------------------------------------------------
// Step 5 — 测量过程
// ---------------------------------------------------------------------------

/**
 * New format: empty item list.  The wizard Step 5 UI starts blank and the
 * user adds measurement event cards one by one.
 *
 * MeasurementItem[] is imported at the callsite (useWizardForm) to avoid
 * circular deps with ontologyModules.ts.
 */
export const DEFAULT_STEP5_ITEMS = [] as const;

/**
 * Legacy fallback only — kept so old notes that still carry
 * `step5.fields` can be read by wizardToModules without error.
 * Never used as initial state for new wizard sessions.
 */
export const DEFAULT_STEP5_FIELDS: ExperimentField[] = [
  { id: "s5-1", name: "测量方法", type: "object", value: "", items: [], objects: [] },
  { id: "s5-2", name: "测量对象", type: "object", value: "", items: [], objects: [] },
  { id: "s5-3", name: "测量条件", type: "object", value: "", items: [], objects: [] },
  { id: "s5-4", name: "测量仪器", type: "object", value: "", items: [], objects: [] },
];

// ---------------------------------------------------------------------------
// Step 6 — 实验数据
// ---------------------------------------------------------------------------
export const DEFAULT_STEP6_FIELDS: ExperimentField[] = [
  { id: "s6-1", name: "数据项",   type: "object", value: "", items: [], objects: [] },
  { id: "s6-2", name: "结果指标", type: "object", value: "", items: [], objects: [] },
  { id: "s6-3", name: "观察记录", type: "list",   value: "", items: [], objects: [] },
];
