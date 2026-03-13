import type {
  OntologyModule,
  OntologyModuleKey,
  OntologyVersion,
  ExperimentRecord,
  PurposeAssistResult,
} from "@/types/workbench";

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
    // Convert plain-text content to HTML paragraphs
    const paragraphs = mod.content
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => `<p>${l}</p>`)
      .join("");
    lines.push(paragraphs || "<p>（未填写）</p>");
  }

  lines.push("<hr>");
  lines.push("<p><strong>预期输出：</strong>各步骤完成后记录原始数据，汇总至实验数据模块。</p>");

  return lines.join("\n");
}
