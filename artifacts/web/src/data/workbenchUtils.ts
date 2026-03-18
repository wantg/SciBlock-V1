import type {
  OntologyModule,
  OntologyModuleKey,
  OntologyVersion,
  ExperimentRecord,
  PurposeAssistResult,
} from "@/types/workbench";
import type { OntologyModuleStructuredData } from "@/types/ontologyModules";
import type {
  SystemObject,
  PrepItem,
  OperationStep,
  MeasurementItem,
  DataItem,
} from "@/types/ontologyModules";
import type { ExperimentField } from "@/types/experimentFields";
import type { WizardFormData, Step3Data } from "@/types/wizardForm";
import { makeTag } from "@/types/experimentFields";

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Ontology helpers
// ---------------------------------------------------------------------------

/**
 * Deep-clone a module array so each record holds its own mutable copy
 * that does not share references with the source version.
 */
export function cloneModules(modules: OntologyModule[]): OntologyModule[] {
  return modules.map((m) => ({ ...m, status: "inherited" as const, isHighlighted: false }));
}

// ---------------------------------------------------------------------------
// Record factory
// ---------------------------------------------------------------------------

export function createExperimentRecord(
  sciNoteId: string,
  inheritedVersion: OntologyVersion,
  index: number,
): ExperimentRecord {
  const now = new Date().toISOString();
  const pad = (n: number) => String(n).padStart(3, "0");
  return {
    id: generateId("rec"),
    sciNoteId,
    title: "",
    purposeInput: undefined,
    experimentStatus: "探索中",
    experimentCode: `EXP-${pad(index)}`,
    tags: [],
    inheritedOntologyVersionId: inheritedVersion.id,
    currentModules: cloneModules(inheritedVersion.modules),
    editorContent: "",
    createdAt: now,
    sequenceNumber: index,
    confirmationState: "draft",
    derivedFromSourceType: "initial",
    derivedFromContextVer: 0,
  };
}

/**
 * Variant of createExperimentRecord that accepts a pre-built module list
 * (e.g. from wizardToModules) instead of an OntologyVersion.
 * Used on first workbench visit when wizard form data is available.
 */
export function createExperimentRecordWithModules(
  sciNoteId: string,
  modules: OntologyModule[],
  index: number,
): ExperimentRecord {
  const now = new Date().toISOString();
  const pad = (n: number) => String(n).padStart(3, "0");
  return {
    id: generateId("rec"),
    sciNoteId,
    title: "",
    purposeInput: undefined,
    experimentStatus: "探索中",
    experimentCode: `EXP-${pad(index)}`,
    tags: [],
    inheritedOntologyVersionId: "wizard_generated",
    currentModules: cloneModules(modules),
    editorContent: "",
    createdAt: now,
    sequenceNumber: index,
    confirmationState: "draft",
    derivedFromSourceType: "initial",
    derivedFromContextVer: 0,
  };
}

// ---------------------------------------------------------------------------
// AI title assist mock
// ---------------------------------------------------------------------------

const MOCK_RESULTS: PurposeAssistResult[] = [
  {
    generatedTitle: "ZnO 薄膜退火温度影响探索",
    purposeDraft:
      "本次实验旨在系统研究不同退火温度（200–500°C）对 RF 磁控溅射制备的 ZnO 薄膜晶体结构、表面形貌和导电性的影响规律，为后续优化工艺参数提供实验依据。",
    highlightedModuleKeys: ["preparation", "operation", "measurement", "data"],
  },
  {
    generatedTitle: "低温溅射 ZnO 薄膜工艺优化",
    purposeDraft:
      "探索在室温基底条件下，通过调整 Ar/O₂ 分压比和 RF 功率，在不引入退火步骤的情况下制备具有一定结晶度的 ZnO 薄膜，降低工艺热预算。",
    highlightedModuleKeys: ["system", "preparation", "operation"],
  },
  {
    generatedTitle: "ZnO 薄膜方块电阻与结晶度关联分析",
    purposeDraft:
      "通过对比不同工艺条件下 ZnO 薄膜的 XRD (002) 衍射峰强度与四探针法测量的方块电阻，建立结晶质量与导电性之间的量化关联模型。",
    highlightedModuleKeys: ["measurement", "data"],
  },
];

/**
 * Simulated AI response for the title-assist feature.
 * Rotates through mock results based on input length — in production
 * this would be replaced by a real API call.
 */
export function mockPurposeAssist(input: string): PurposeAssistResult {
  const idx = input.length % MOCK_RESULTS.length;
  return MOCK_RESULTS[idx];
}

// ---------------------------------------------------------------------------
// Flow draft mock
// ---------------------------------------------------------------------------

const MODULE_TITLE_MAP: Record<OntologyModuleKey, string> = {
  system: "实验系统",
  preparation: "实验准备",
  operation: "实验操作",
  measurement: "测量过程",
  data: "实验数据",
};

/**
 * Derive a short item-name summary from a module's structuredData.
 * Returns an array of HTML <li> strings, or an empty array if no data.
 */
function moduleItemLines(mod: OntologyModule): string[] {
  const sd = mod.structuredData;
  if (!sd) return [];
  const names: string[] = [];
  sd.systemObjects?.forEach((o) => names.push(o.name));
  sd.prepItems?.forEach((p) => names.push(p.name));
  sd.operationSteps?.forEach((s) => names.push(`步骤 ${s.order}：${s.name}`));
  sd.measurementItems?.forEach((m) => names.push(m.name));
  sd.dataItems?.forEach((d) => names.push(d.name));
  return names.filter(Boolean).map((n) => `<li>${n}</li>`);
}

/**
 * Generates a mock experiment-flow draft based on the confirmed module contents.
 * Returns HTML compatible with TipTap's StarterKit.
 */
export function generateFlowDraft(modules: OntologyModule[]): string {
  const lines: string[] = [
    "<h3>实验流程草稿（自动生成）</h3>",
    "<p>以下流程依据当前已确认的本体模块自动生成，请根据实际情况修改。</p>",
    "<hr>",
  ];

  for (const mod of modules) {
    lines.push(`<h4>${MODULE_TITLE_MAP[mod.key]}</h4>`);
    const items = moduleItemLines(mod);
    if (items.length > 0) {
      lines.push(`<ul>${items.join("")}</ul>`);
    } else {
      lines.push("<p>（未填写）</p>");
    }
  }

  lines.push("<hr>");
  lines.push("<p><strong>预期输出：</strong>各步骤完成后记录原始数据，汇总至实验数据模块。</p>");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// wizardToModules — WizardFormData → OntologyModule[] (real inheritance)
// ---------------------------------------------------------------------------

/**
 * Build an OntologyModule shell with shared defaults.
 * All modules start as "inherited" (unconfirmed) so the user sees
 * them highlighted for review on first workbench visit.
 */
function makeModule(
  key: OntologyModuleKey,
  title: string,
  structuredData: OntologyModuleStructuredData,
): OntologyModule {
  return {
    key,
    title,
    structuredData,
    status: "inherited",
    isHighlighted: false,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns the full set of 5 ontology modules, each with empty structuredData.
 *
 * Purpose: used as the `currentModules` base when creating a new (non-first)
 * experiment record.  The server's MergeHeritableModules will:
 *   - Replace heritable module content (system/preparation/operation/measurement)
 *     with inherited defaults from the chain.
 *   - Keep the non-heritable data module from this base — preserving its
 *     existence in the result while leaving its content blank/fresh for this
 *     record.
 *
 * Sending an empty [] instead breaks this: MergeHeritableModules appends only
 * the 4 heritable modules, causing the data module to disappear entirely.
 */
export function blankAllModules(): OntologyModule[] {
  return [
    makeModule("system",      "实验系统", {}),
    makeModule("preparation", "实验准备", {}),
    makeModule("operation",   "实验操作", {}),
    makeModule("measurement", "测量过程", {}),
    makeModule("data",        "实验数据", {}),
  ];
}

// ----- Step 2 → 实验系统 -----

/**
 * Step 2 experiment-level metadata (实验名称, 实验类型, 实验目标) is now
 * stored directly on SciNote (experimentType, objective) and does NOT
 * produce a synthetic SystemObject.
 *
 * Only user-added object-type fields are mapped to real SystemObjects.
 * The old "实验概要" synthetic object is not generated for new notes.
 * Legacy notes that already carry it in structuredData continue to display
 * normally — the SystemModuleEditor renders it like any other SystemObject.
 */
function step2ToSystemObjects(fields: ExperimentField[]): SystemObject[] {
  const objects: SystemObject[] = [];

  for (const field of fields) {
    if (field.type !== "object") continue;
    for (const item of field.objects) {
      if (!item.name.trim()) continue;
      objects.push({
        id: generateId("sys"),
        name: item.name.trim(),
        role: field.name,
        attributes: item.tags,
      });
    }
  }

  return objects;
}

// ----- Step 3 → 实验准备 -----

/**
 * Legacy fallback — only used when a note still carries the old
 * Step3Data.fields format (field groups like 准备材料 / 准备设备 / 前处理事项).
 *
 * The field group name becomes PrepItem.category — which now aligns with the
 * updated PREP_CATEGORY options, so badges render with correct colors.
 *
 * object fields: each ObjectItem → PrepItem (name + attributes)
 * list fields:   each string   → PrepItem (name only)
 * text fields:   the value     → PrepItem (name only, if non-empty)
 */
function step3ToPrepItemsLegacy(fields: ExperimentField[]): PrepItem[] {
  const items: PrepItem[] = [];

  for (const field of fields) {
    if (field.type === "object") {
      for (const obj of field.objects) {
        if (!obj.name.trim()) continue;
        items.push({
          id: generateId("prep"),
          name: obj.name.trim(),
          category: field.name,
          attributes: obj.tags,
        });
      }
    } else if (field.type === "list") {
      for (const text of field.items) {
        if (!text.trim()) continue;
        items.push({
          id: generateId("prep"),
          name: text.trim(),
          category: field.name,
          attributes: [],
        });
      }
    } else if (field.type === "text" && field.value.trim()) {
      items.push({
        id: generateId("prep"),
        name: field.value.trim(),
        category: field.name,
        attributes: [],
      });
    }
  }

  return items;
}

/**
 * Converts Step3Data to PrepItem[]:
 *   new format (items[]) → direct passthrough (zero transformation)
 *   old format (fields)  → step3ToPrepItemsLegacy best-effort mapping
 */
function step3ToPrepItems(step3: Step3Data): PrepItem[] {
  if (step3.items && step3.items.length > 0) return step3.items;
  if (step3.fields && step3.fields.length > 0) return step3ToPrepItemsLegacy(step3.fields);
  return [];
}

// ----- Step 4 → 实验操作 -----

/**
 * Legacy fallback — only used when a note still carries the old
 * Step4Data.fields format (field groups like 操作步骤 / 安全注意事项).
 *
 * order is assigned sequentially across ALL step4 fields so the
 * global procedure order is preserved.
 *
 * object fields: each ObjectItem → OperationStep (name + params)
 * list fields:   each string   → OperationStep (name only, notes = field name)
 * text fields:   the value     → OperationStep (name only)
 *
 * This function will never be called for notes created after the Step 4
 * refactor — those notes carry items[] and go through the passthrough path.
 */
function step4ToOperationStepsLegacy(fields: ExperimentField[]): OperationStep[] {
  const steps: OperationStep[] = [];
  let order = 1;

  for (const field of fields) {
    if (field.type === "object") {
      for (const obj of field.objects) {
        if (!obj.name.trim()) continue;
        steps.push({
          id: generateId("step"),
          order: order++,
          name: obj.name.trim(),
          params: obj.tags,
          notes: field.name !== "操作步骤" ? field.name : undefined,
        });
      }
    } else if (field.type === "list") {
      for (const text of field.items) {
        if (!text.trim()) continue;
        steps.push({
          id: generateId("step"),
          order: order++,
          name: text.trim(),
          params: [],
          notes: field.name,
        });
      }
    } else if (field.type === "text" && field.value.trim()) {
      steps.push({
        id: generateId("step"),
        order: order++,
        name: field.value.trim(),
        params: [],
        notes: field.name !== "操作步骤" ? field.name : undefined,
      });
    }
  }

  return steps;
}

/**
 * step4ToOperationSteps — dispatch between the two Step4Data formats.
 *
 * New format (items[]): direct passthrough — 1:1 fidelity, zero conversion.
 *   OperationStep.order is already set correctly by the wizard editor
 *   (maintained as index+1 on create/delete). No renumbering needed.
 *   OperationStep.notes is user-provided "备注/注意事项" text, preserved verbatim.
 *
 * Legacy format (fields[]): best-effort mapping via the legacy function above.
 */
function step4ToOperationSteps(step4: { items?: OperationStep[]; fields?: ExperimentField[] }): OperationStep[] {
  if (step4.items && step4.items.length > 0) {
    return step4.items;
  }
  if (step4.fields && step4.fields.length > 0) {
    return step4ToOperationStepsLegacy(step4.fields);
  }
  return [];
}

// ----- Step 5 → 测量过程 -----

/**
 * Legacy fallback — only used when a note still carries the old
 * Step5Data.fields format (four parallel field groups: 测量方法 / 测量对象 /
 * 测量条件 / 测量仪器).
 *
 * This is a best-effort mapping that cannot reconstruct the cross-field
 * relationships.  The original formData is always preserved on SciNote so
 * no data is lost even if the mapping is imperfect.
 *
 * This function will never be called for notes created after the Step 5
 * refactor — those notes carry items[] and go through the passthrough path.
 */
function step5ToMeasurementItemsLegacy(fields: ExperimentField[]): MeasurementItem[] {
  const items: MeasurementItem[] = [];

  for (const field of fields) {
    if (field.type === "object") {
      for (const obj of field.objects) {
        if (!obj.name.trim()) continue;
        items.push({
          id: generateId("meas"),
          name: obj.name.trim(),
          instrument: field.name === "测量仪器" ? obj.name.trim() : undefined,
          method:     field.name === "测量方法" ? obj.name.trim() : undefined,
          target:     field.name === "测量对象" ? obj.name.trim() : "",
          conditions: obj.tags,
        });
      }
    } else if (field.type === "list") {
      for (const text of field.items) {
        if (!text.trim()) continue;
        items.push({
          id: generateId("meas"),
          name: text.trim(),
          target: "",
          conditions: [],
        });
      }
    }
  }

  return items;
}

/**
 * step5ToMeasurementItems — dispatch between the two Step5Data formats.
 *
 * New format (items[]): direct passthrough — 1:1 fidelity, zero conversion.
 * Legacy format (fields[]): best-effort mapping via the legacy function above.
 *
 * The check is ordered: if items is present and non-empty, it always wins.
 * This ensures new notes never fall through to the legacy path even if
 * fields? happens to exist on the object for some reason.
 */
function step5ToMeasurementItems(step5: { items?: MeasurementItem[]; fields?: ExperimentField[] }): MeasurementItem[] {
  if (step5.items && step5.items.length > 0) {
    return step5.items;
  }
  if (step5.fields && step5.fields.length > 0) {
    return step5ToMeasurementItemsLegacy(step5.fields);
  }
  return [];
}

// ----- Step 6 → 实验数据 -----

/**
 * Legacy fallback — only used when a note still carries the old
 * Step6Data.fields format (three field groups: 数据项 / 结果指标 / 观察记录).
 *
 * This is a best-effort mapping.  The original formData is always preserved
 * on SciNote so no data is lost even if the mapping is imperfect.
 *
 * This function will never be called for notes created after the Step 6
 * refactor — those notes carry items[] and go through the passthrough path.
 */
function step6ToDataItemsLegacy(fields: ExperimentField[]): DataItem[] {
  const items: DataItem[] = [];

  for (const field of fields) {
    if (field.type === "object") {
      for (const obj of field.objects) {
        if (!obj.name.trim()) continue;
        items.push({
          id: generateId("data"),
          name: obj.name.trim(),
          attributes: obj.tags,
          description: field.name !== "数据项" ? field.name : undefined,
        });
      }
    } else if (field.type === "list") {
      for (const text of field.items) {
        if (!text.trim()) continue;
        items.push({
          id: generateId("data"),
          name: text.trim(),
          attributes: [],
          description: field.name,
        });
      }
    } else if (field.type === "text" && field.value.trim()) {
      items.push({
        id: generateId("data"),
        name: field.value.trim(),
        attributes: [],
        description: field.name !== "数据项" ? field.name : undefined,
      });
    }
  }

  return items;
}

/**
 * step6ToDataItems — dispatch between the two Step6Data formats.
 *
 * New format (items[]): direct passthrough — 1:1 fidelity, zero conversion.
 *   DataItem is the wizard type; it passes directly to the workbench module.
 *   description is user-provided "备注/说明" text, preserved verbatim.
 *
 * Legacy format (fields[]): best-effort mapping via the legacy function above.
 *
 * The check is ordered: if items is present and non-empty, it always wins.
 */
function step6ToDataItems(step6: { items?: DataItem[]; fields?: ExperimentField[] }): DataItem[] {
  if (step6.items && step6.items.length > 0) {
    return step6.items;
  }
  if (step6.fields && step6.fields.length > 0) {
    return step6ToDataItemsLegacy(step6.fields);
  }
  return [];
}

// ----- Public entry point -----

/**
 * wizardToModules — pure function that converts wizard form data into the
 * initial OntologyModule list for a new SciNote workbench.
 *
 * Coverage:
 *   Step 2 → 实验系统   metadata as "实验概要" SystemObject + any object fields
 *   Step 3 → 实验准备   object/list/text fields → PrepItem[] (field name = category)
 *   Step 4 → 实验操作   object/list/text fields → OperationStep[] (sequential order)
 *   Step 5 → 测量过程   new: direct passthrough (items[]); legacy: best-effort from fields[]
 *   Step 6 → 实验数据   new: direct passthrough (items[]); legacy: best-effort from fields[]
 *
 * Called once per SciNote on first workbench visit. Never mutates its input.
 * Replace DEFAULT_ONTOLOGY_VERSION fallback with the result of this function
 * whenever formData is available.
 */
export function wizardToModules(formData: WizardFormData): OntologyModule[] {
  return [
    makeModule("system",      "实验系统", { systemObjects:    step2ToSystemObjects(formData.step2.fields)   }),
    makeModule("preparation", "实验准备", { prepItems:        step3ToPrepItems(formData.step3)              }),
    makeModule("operation",   "实验操作", { operationSteps:   step4ToOperationSteps(formData.step4)         }),
    makeModule("measurement", "测量过程", { measurementItems: step5ToMeasurementItems(formData.step5)       }),
    makeModule("data",        "实验数据", { dataItems:        step6ToDataItems(formData.step6)              }),
  ];
}
