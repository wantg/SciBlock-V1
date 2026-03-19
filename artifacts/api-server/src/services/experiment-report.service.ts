/**
 * experiment-report.service.ts
 *
 * Phase 3: Content quality upgrade.
 *
 * Key changes from Phase 2:
 *  - Backend computes EvidenceLevel before calling AI (no longer relying on model to guess)
 *  - Extended prompt includes: purpose_input, editor_content excerpt, full measurement
 *    conditions, all data attributes, all operation params, first 3 system object attributes
 *  - AI response now includes optional evidenceLevel + missingInfoHints
 *  - System prompt completely rewritten with 3-tier guidance and explicit prohibitions
 *  - Renderer adds evidence-level context label in findings / conclusion sections
 *  - Improved fallback text (less mechanical, tier-aware)
 *
 * Pipeline:
 *   DB experiment record
 *   → mapToReportModel()         (rule-based mapper — renderer data)
 *   → extractAiContext()         (extended context — AI prompt data only)
 *   → computeEvidenceLevel()     (backend pre-assessment)
 *   → callAiForReportBlocks()    (AI: 3 blocks + evidenceLevel + missingInfoHints)
 *   → merge AI output into model
 *   → renderReportModel()        (HTML with evidence labels)
 *   → persist to DB
 */

import { pool } from "@workspace/db";
import { buildProviderConfig, callChatJson } from "./ai-client.service";

// ---------------------------------------------------------------------------
// Raw DB types
// ---------------------------------------------------------------------------

interface ExperimentDbRow {
  id: string;
  title: string;
  purpose_input: string | null;
  editor_content: string | null;      // Phase 3: user's TipTap free text
  current_modules: string | null;     // JSON string of OntologyModule[]
  experiment_type: string | null;     // from scinotes.experiment_type
  objective: string | null;           // from scinotes.objective
}

// ---------------------------------------------------------------------------
// Ontology module types (minimal — mirrors artifacts/web/src/types/ontologyModules.ts)
// ---------------------------------------------------------------------------

interface Tag { key: string; value: string }

interface SystemObject {
  id: string; name: string; role: string; attributes: Tag[];
}
interface PrepItem {
  id: string; name: string; category: string; attributes: Tag[];
}
interface OperationStep {
  id: string; order: number; name: string; params: Tag[];
}
interface MeasurementItem {
  id: string; name: string; instrument?: string; method?: string;
  target: string; conditions: Tag[];
}
interface DataItem {
  id: string; name: string; attributes: Tag[];
}
interface OntologyModuleStructuredData {
  systemObjects?: SystemObject[];
  prepItems?: PrepItem[];
  operationSteps?: OperationStep[];
  measurementItems?: MeasurementItem[];
  dataItems?: DataItem[];
}
interface OntologyModule {
  key: string;
  structuredData?: OntologyModuleStructuredData;
}

// ---------------------------------------------------------------------------
// Evidence level — computed by backend before calling AI
// ---------------------------------------------------------------------------

export type EvidenceLevel = "high" | "medium" | "low";

/**
 * computeEvidenceLevel
 *
 * Determines data richness BEFORE calling the AI, so that:
 *  - The AI receives explicit guidance per tier
 *  - We can generate tier-appropriate fallback text without AI
 *
 * Tiers:
 *   high   — objective + measurements + data types + (steps or system)
 *   medium — partial data: some measurements OR (objective + steps)
 *   low    — very sparse: no measurements, no data types
 */
function computeEvidenceLevel(
  objective:    string | null,
  measCount:    number,
  dataCount:    number,
  stepCount:    number,
  systemCount:  number,
): EvidenceLevel {
  const hasObjective    = (objective?.trim().length ?? 0) > 5;
  const hasMeasurements = measCount > 0;
  const hasDataTypes    = dataCount > 0;
  const hasSteps        = stepCount > 0;
  const hasSystem       = systemCount > 0;

  if (hasObjective && hasMeasurements && hasDataTypes && (hasSteps || hasSystem)) return "high";
  if (hasMeasurements || hasDataTypes || (hasObjective && hasSteps)) return "medium";
  return "low";
}

/**
 * Compute missing-info hints from backend data (independent of AI).
 * These are passed to the AI as context AND used in the fallback renderer.
 */
function computeMissingHints(
  objective:   string | null,
  measCount:   number,
  dataCount:   number,
  stepCount:   number,
  systemCount: number,
): string[] {
  const hints: string[] = [];
  if (!objective?.trim())     hints.push("缺少实验目标描述，建议在 SciNote 中补充后重新生成");
  if (measCount === 0)        hints.push("缺少测量/表征方法记录，当前无法支持结果分析");
  if (dataCount === 0)        hints.push("缺少数据类型记录，当前无法明确实验产出");
  if (stepCount === 0)        hints.push("缺少操作步骤，建议补充实验过程记录");
  if (systemCount === 0)      hints.push("缺少实验系统对象，建议记录研究对象信息");
  return hints;
}

// ---------------------------------------------------------------------------
// Report model types (mirrors artifacts/web/src/types/report.ts)
// ---------------------------------------------------------------------------

interface ReportSystemObject { name: string; role: string; keyAttribute?: string }
interface ReportSystemSummary { totalObjects: number; coreObjects: ReportSystemObject[]; hasMore: boolean }
interface ReportPrepCategory { category: string; items: string[] }
interface ReportPreparationSummary { totalItems: number; byCategory: ReportPrepCategory[] }
interface ReportProcedureStep { order: number; name: string; keyParam?: string }
interface ReportProcedureSummary { totalSteps: number; keySteps: ReportProcedureStep[]; hasMore: boolean }
interface ReportMeasurementMethod { name: string; target: string; instrument?: string }
interface ReportDataType { name: string; unit?: string }
interface ReportMeasurementDataSummary { methods: ReportMeasurementMethod[]; dataTypes: ReportDataType[] }

interface ExperimentReportModel {
  title: string;
  experimentType?: string;
  objective?: string;
  reportSummary: string;
  systemSummary: ReportSystemSummary;
  preparationSummary: ReportPreparationSummary;
  procedureSummary: ReportProcedureSummary;
  measurementDataSummary: ReportMeasurementDataSummary;
  findingsPlaceholder: string;
  conclusionPlaceholder: string;
  generatedAt: string;
  source: "stub" | "ai" | "manual";
  // Phase 3: backend-computed quality context
  evidenceLevel: EvidenceLevel;
  backendMissingHints: string[];   // pre-computed, used in fallback + renderer
  // AI-generated fields
  aiSummary?: string;
  aiAnalysis?: string;
  aiConclusion?: string;
  aiEvidenceLevel?: EvidenceLevel;   // AI's own assessment (may differ slightly)
  aiMissingInfoHints?: string[];     // AI's suggestions for missing info
}

// ---------------------------------------------------------------------------
// Extended AI context — richer data for the prompt, NOT stored in the model
// ---------------------------------------------------------------------------

interface MeasurementDetail {
  name: string;
  target: string;
  instrument?: string;
  method?: string;
  conditions: Tag[];
}
interface DataDetail {
  name: string;
  attrs: Tag[];                // ALL attributes, not just 单位
}
interface StepDetail {
  order: number;
  name: string;
  params: Tag[];               // ALL params
}
interface SystemDetail {
  name: string;
  role: string;
  attrs: Tag[];                // first 3 attributes
}

interface ExperimentAiContext {
  evidenceLevel: EvidenceLevel;
  evidenceLevelLabel: string;
  backendMissingHints: string[];
  userFreeText?: string;         // combined purpose_input + editor_content excerpt
  measurementDetails: MeasurementDetail[];
  dataDetails: DataDetail[];
  stepDetails: StepDetail[];
  systemDetails: SystemDetail[];
}

// ---------------------------------------------------------------------------
// Display caps
// ---------------------------------------------------------------------------

const MAX_SYSTEM_OBJECTS  = 5;
const MAX_PREP_PER_CAT    = 5;
const MAX_PROCEDURE_STEPS = 8;
const MAX_MEASUREMENTS    = 5;
const MAX_DATA_TYPES      = 5;

// ---------------------------------------------------------------------------
// Mapper — produces ExperimentReportModel for the renderer
// ---------------------------------------------------------------------------

function mapToReportModel(
  row: ExperimentDbRow,
  evidenceLevel: EvidenceLevel,
  backendMissingHints: string[],
): ExperimentReportModel {
  let modules: OntologyModule[] = [];
  try {
    modules = row.current_modules ? (JSON.parse(row.current_modules) as OntologyModule[]) : [];
  } catch { /* ignore */ }

  const sd = (key: string): OntologyModuleStructuredData =>
    modules.find((m) => m.key === key)?.structuredData ?? {};

  const systemObjects    = sd("system").systemObjects        ?? [];
  const prepItems        = sd("preparation").prepItems        ?? [];
  const operationSteps   = sd("operation").operationSteps     ?? [];
  const measurementItems = sd("measurement").measurementItems ?? [];
  const dataItems        = sd("data").dataItems               ?? [];

  // reportSummary — template-based (overridden by AI aiSummary)
  const parts: string[] = [];
  const titlePart = row.title ? `《${row.title}》` : "本实验";
  const typePart  = row.experiment_type ? `属于${row.experiment_type}类研究` : "";
  parts.push(`${titlePart}${typePart ? typePart + "，" : ""}旨在通过实验手段获取系统性数据。`);
  if (row.objective) parts.push(`实验目标为：${row.objective}。`);
  const descParts: string[] = [];
  if (systemObjects.length > 0) {
    const roles = [...new Set(systemObjects.map((o) => o.role).filter(Boolean))];
    descParts.push(roles.length > 0
      ? `实验系统涉及 ${roles.slice(0, 3).join("、")} 等 ${systemObjects.length} 个核心对象`
      : `实验系统包含 ${systemObjects.length} 个研究对象`);
  }
  if (operationSteps.length > 0) descParts.push(`共执行 ${operationSteps.length} 个操作步骤`);
  if (measurementItems.length > 0) descParts.push(`采用 ${measurementItems.length} 种测量/表征方法`);
  if (descParts.length > 0) parts.push(descParts.join("，") + "。");
  const reportSummary = parts.join(" ").trim();

  // systemSummary (for renderer display only — first attribute)
  const coreObjects = systemObjects.slice(0, MAX_SYSTEM_OBJECTS).map((obj) => ({
    name: obj.name,
    role: obj.role,
    keyAttribute: obj.attributes.length > 0
      ? `${obj.attributes[0].key}：${obj.attributes[0].value}`
      : undefined,
  }));

  // preparationSummary
  const catMap = new Map<string, string[]>();
  for (const item of prepItems) {
    const cat = item.category?.trim() || "其他";
    if (!catMap.has(cat)) catMap.set(cat, []);
    const bucket = catMap.get(cat)!;
    if (bucket.length < MAX_PREP_PER_CAT) bucket.push(item.name);
  }

  // procedureSummary (for renderer — first param only)
  const sorted   = [...operationSteps].sort((a, b) => a.order - b.order);
  const keySteps = sorted.slice(0, MAX_PROCEDURE_STEPS).map((step) => ({
    order: step.order, name: step.name,
    keyParam: step.params.length > 0 ? `${step.params[0].key}：${step.params[0].value}` : undefined,
  }));

  // measurementDataSummary (for renderer — name/target/instrument only)
  const methods   = measurementItems.slice(0, MAX_MEASUREMENTS).map((item) => ({
    name: item.name, target: item.target, instrument: item.instrument,
  }));
  const dataTypes = dataItems.slice(0, MAX_DATA_TYPES).map((item) => ({
    name: item.name,
    unit: item.attributes.find((a) => a.key === "单位")?.value,
  }));

  // Tier-aware placeholder text
  const findingsPlaceholder = evidenceLevel === "low"
    ? "当前实验记录尚不完整，建议补充测量方法和数据类型后重新生成，届时将自动填充基于记录的分析内容。"
    : "结果分析将在 AI 生成后自动填充，当前可在编辑报告模式下手动补充。";
  const conclusionPlaceholder = evidenceLevel === "low"
    ? "当前信息不足以形成有支撑的结论，建议完善实验记录后重新生成。"
    : "结论将在 AI 生成后自动填充，当前可在编辑报告模式下手动补充。";

  return {
    title: row.title,
    experimentType: row.experiment_type ?? undefined,
    objective: row.objective ?? undefined,
    reportSummary,
    systemSummary: { totalObjects: systemObjects.length, coreObjects, hasMore: systemObjects.length > MAX_SYSTEM_OBJECTS },
    preparationSummary: {
      totalItems: prepItems.length,
      byCategory: Array.from(catMap.entries()).map(([category, items]) => ({ category, items })),
    },
    procedureSummary: { totalSteps: operationSteps.length, keySteps, hasMore: operationSteps.length > MAX_PROCEDURE_STEPS },
    measurementDataSummary: { methods, dataTypes },
    findingsPlaceholder,
    conclusionPlaceholder,
    generatedAt: new Date().toISOString(),
    source: "ai",
    evidenceLevel,
    backendMissingHints,
  };
}

// ---------------------------------------------------------------------------
// AI context extractor — rich data for the prompt ONLY (not stored in model)
// ---------------------------------------------------------------------------

const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  high:   "较充分（可形成有支撑的分析和阶段性结论）",
  medium: "部分充分（支持有限分析，需明确标注局限性）",
  low:    "明显不足（只能做记录性总结，禁止做分析性推断）",
};

function extractUserFreeText(row: ExperimentDbRow): string | undefined {
  const parts: string[] = [];
  if (row.purpose_input?.trim()) {
    parts.push(`[实验目的补充说明] ${row.purpose_input.trim().slice(0, 250)}`);
  }
  if (row.editor_content) {
    // Strip HTML tags from TipTap content
    const plain = row.editor_content
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (plain.length > 20) {
      parts.push(`[实验记录笔记摘录] ${plain.slice(0, 450)}`);
    }
  }
  return parts.length > 0 ? parts.join("\n") : undefined;
}

function extractAiContext(
  row: ExperimentDbRow,
  evidenceLevel: EvidenceLevel,
  backendMissingHints: string[],
  modules: OntologyModule[],
): ExperimentAiContext {
  const sd = (key: string): OntologyModuleStructuredData =>
    modules.find((m) => m.key === key)?.structuredData ?? {};

  const systemObjects    = sd("system").systemObjects        ?? [];
  const operationSteps   = sd("operation").operationSteps    ?? [];
  const measurementItems = sd("measurement").measurementItems ?? [];
  const dataItems        = sd("data").dataItems              ?? [];

  // System objects — up to first 3 attributes each
  const systemDetails: SystemDetail[] = systemObjects.slice(0, MAX_SYSTEM_OBJECTS).map((obj) => ({
    name: obj.name,
    role: obj.role,
    attrs: obj.attributes.slice(0, 3),
  }));

  // All measurement conditions (full)
  const measurementDetails: MeasurementDetail[] = measurementItems.slice(0, MAX_MEASUREMENTS).map((item) => ({
    name: item.name,
    target: item.target,
    instrument: item.instrument,
    method: item.method,
    conditions: item.conditions ?? [],
  }));

  // All data attributes (not just 单位)
  const dataDetails: DataDetail[] = dataItems.slice(0, MAX_DATA_TYPES).map((item) => ({
    name: item.name,
    attrs: item.attributes,
  }));

  // All operation params (all params per step)
  const sorted = [...operationSteps].sort((a, b) => a.order - b.order);
  const stepDetails: StepDetail[] = sorted.slice(0, MAX_PROCEDURE_STEPS).map((step) => ({
    order: step.order,
    name: step.name,
    params: step.params,
  }));

  return {
    evidenceLevel,
    evidenceLevelLabel: EVIDENCE_LEVEL_LABELS[evidenceLevel],
    backendMissingHints,
    userFreeText: extractUserFreeText(row),
    measurementDetails,
    dataDetails,
    stepDetails,
    systemDetails,
  };
}

// ---------------------------------------------------------------------------
// Renderer — HTML output for TipTap display
// ---------------------------------------------------------------------------

const CHINESE_NUMS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

function esc(str: string | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sectionNum(sections: string[], key: string): string {
  const idx = sections.indexOf(key);
  return CHINESE_NUMS[idx] ?? String(idx + 1);
}

const EVIDENCE_NOTE: Record<EvidenceLevel, string> = {
  high:   "",   // No prefix note needed — content speaks for itself
  medium: "当前信息充分度有限，以下分析为初步判断，受现有记录范围约束。",
  low:    "当前实验记录尚不完整，以下仅为记录性总结，不代表经验证的分析结论。",
};

const CONCLUSION_NOTE: Record<EvidenceLevel, string> = {
  high:   "",
  medium: "以下为阶段性结论，有待补充数据后进一步验证。",
  low:    "当前信息不足以形成明确结论，以下仅为初步记录。",
};

function renderReportModel(m: ExperimentReportModel): string {
  const ts = new Date(m.generatedAt).toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const sections: string[] = ["summary", "system", "preparation", "procedure", "measurement", "findings", "conclusion"];
  if (m.objective) sections.unshift("objective");

  const blocks: string[] = [];

  // Header
  const meta: string[] = [];
  if (m.experimentType) meta.push(`<strong>类型：</strong>${esc(m.experimentType)}`);
  meta.push(`<strong>生成时间：</strong>${ts}`);
  blocks.push(`<h1>${esc(m.title) || "（未命名实验）"}</h1>\n<p>${meta.join("　　")}</p>\n<hr>`);

  // 实验目的
  if (m.objective) {
    blocks.push(`<h2>${sectionNum(sections, "objective")}、实验目的</h2>\n<p>${esc(m.objective)}</p>`);
  }

  // 实验概述 (AI or template)
  const summaryText = m.aiSummary || m.reportSummary;
  if (summaryText) {
    blocks.push(`<h2>${sectionNum(sections, "summary")}、实验概述</h2>\n<p>${esc(summaryText)}</p>`);
  }

  // 实验系统
  const sys = m.systemSummary;
  const sysLines = [`<h2>${sectionNum(sections, "system")}、实验系统与研究对象</h2>`];
  if (sys.totalObjects === 0) {
    sysLines.push("<p>（暂未填写实验系统信息）</p>");
  } else {
    sysLines.push("<ul>");
    for (const obj of sys.coreObjects) {
      const rolePart = obj.role ? `【${esc(obj.role)}】` : "";
      const attrPart = obj.keyAttribute ? `　${esc(obj.keyAttribute)}` : "";
      sysLines.push(`<li><strong>${esc(obj.name)}</strong>${rolePart}${attrPart}</li>`);
    }
    if (sys.hasMore) sysLines.push(`<li><em>… 另有 ${sys.totalObjects - sys.coreObjects.length} 个对象，详见左侧模块记录</em></li>`);
    sysLines.push("</ul>");
  }
  blocks.push(sysLines.join("\n"));

  // 实验准备
  const prep = m.preparationSummary;
  const prepLines = [`<h2>${sectionNum(sections, "preparation")}、实验准备</h2>`];
  if (prep.totalItems === 0) {
    prepLines.push("<p>（暂未填写实验准备信息）</p>");
  } else {
    for (const group of prep.byCategory) {
      prepLines.push(`<p><strong>${esc(group.category)}</strong></p><ul>`);
      for (const item of group.items) prepLines.push(`<li>${esc(item)}</li>`);
      prepLines.push("</ul>");
    }
    const displayed = prep.byCategory.reduce((s, g) => s + g.items.length, 0);
    if (prep.totalItems > displayed) {
      prepLines.push(`<p><em>（共 ${prep.totalItems} 项，上述为各类别关键项）</em></p>`);
    }
  }
  blocks.push(prepLines.join("\n"));

  // 实验过程
  const proc = m.procedureSummary;
  const procLines = [`<h2>${sectionNum(sections, "procedure")}、实验过程</h2>`];
  if (proc.totalSteps === 0) {
    procLines.push("<p>（暂未填写实验操作步骤）</p>");
  } else {
    procLines.push(`<p>本实验共执行 ${proc.totalSteps} 个操作步骤，关键步骤如下：</p><ol>`);
    for (const step of proc.keySteps) {
      const paramPart = step.keyParam ? `　<em>（${esc(step.keyParam)}）</em>` : "";
      procLines.push(`<li>${esc(step.name)}${paramPart}</li>`);
    }
    if (proc.hasMore) procLines.push(`<li><em>… 另有 ${proc.totalSteps - proc.keySteps.length} 步，详见左侧操作模块记录</em></li>`);
    procLines.push("</ol>");
  }
  blocks.push(procLines.join("\n"));

  // 测量与数据获取
  const mds = m.measurementDataSummary;
  const mdsLines = [`<h2>${sectionNum(sections, "measurement")}、测量与数据获取</h2>`];
  if (mds.methods.length === 0 && mds.dataTypes.length === 0) {
    mdsLines.push("<p>（暂未填写测量与数据信息）</p>");
  } else {
    if (mds.methods.length > 0) {
      mdsLines.push("<p><strong>表征/测量方法</strong></p><ul>");
      for (const meth of mds.methods) {
        const instPart = meth.instrument ? `，仪器：${esc(meth.instrument)}` : "";
        mdsLines.push(`<li>${esc(meth.name)}（对象：${esc(meth.target)}${instPart}）</li>`);
      }
      mdsLines.push("</ul>");
    }
    if (mds.dataTypes.length > 0) {
      mdsLines.push("<p><strong>获取数据类型</strong></p><ul>");
      for (const dt of mds.dataTypes) {
        const unitPart = dt.unit ? `（单位：${esc(dt.unit)}）` : "";
        mdsLines.push(`<li>${esc(dt.name)}${unitPart}</li>`);
      }
      mdsLines.push("</ul>");
    }
  }
  blocks.push(mdsLines.join("\n"));

  // 结果分析 (AI or placeholder)
  const analysisText = m.aiAnalysis;
  const evidenceLevel = m.aiEvidenceLevel ?? m.evidenceLevel;
  const findingsLines = [`<h2>${sectionNum(sections, "findings")}、结果分析</h2>`];

  if (analysisText) {
    const noteText = EVIDENCE_NOTE[evidenceLevel];
    if (noteText) {
      findingsLines.push(`<p><em>【注】${esc(noteText)}</em></p>`);
    }
    findingsLines.push(`<p>${esc(analysisText)}</p>`);
  } else {
    findingsLines.push(`<p><em>${esc(m.findingsPlaceholder)}</em></p>`);
    if (m.backendMissingHints.length > 0) {
      findingsLines.push("<p><em>建议补充以下信息后重新生成报告：</em></p><ul>");
      for (const hint of m.backendMissingHints.slice(0, 4)) {
        findingsLines.push(`<li><em>${esc(hint)}</em></li>`);
      }
      findingsLines.push("</ul>");
    }
  }
  blocks.push(findingsLines.join("\n"));

  // 实验结论 (AI or placeholder)
  const conclusionText = m.aiConclusion;
  const concLines = [`<h2>${sectionNum(sections, "conclusion")}、实验结论</h2>`];
  if (conclusionText) {
    const noteText = CONCLUSION_NOTE[evidenceLevel];
    if (noteText) {
      concLines.push(`<p><em>【注】${esc(noteText)}</em></p>`);
    }
    concLines.push(`<p>${esc(conclusionText)}</p>`);
    // Show AI missing info hints (if any) after conclusion
    if (m.aiMissingInfoHints && m.aiMissingInfoHints.length > 0) {
      concLines.push("<p><em>进一步完善建议：</em></p><ul>");
      for (const hint of m.aiMissingInfoHints.slice(0, 3)) {
        concLines.push(`<li><em>${esc(hint)}</em></li>`);
      }
      concLines.push("</ul>");
    }
  } else {
    concLines.push(`<p><em>${esc(m.conclusionPlaceholder)}</em></p>`);
  }
  blocks.push(concLines.join("\n"));

  return blocks.join("\n");
}

// ---------------------------------------------------------------------------
// AI generation — revised system prompt + extended user prompt
// ---------------------------------------------------------------------------

const EXPERIMENT_REPORT_SYSTEM_PROMPT = `你是科研实验室报告助理。根据用户提供的实验记录，生成报告中的三个核心区块。

【绝对禁止事项 — 这是底线，不可逾越】
1. 禁止编造任何实验结果数值（如"电阻为 X Ω""产率为 X%"）
2. 禁止描述任何实验趋势或规律，除非原始记录中已明确记载
3. 禁止把实验目标当作实验结论（目标是"希望达成的"，结论是"已经获得支撑的"）
4. 禁止使用"实验证明""结果表明""数据显示"等强断言，除非记录中确实有结果数据
5. 禁止编造对照组、参考组的比较结论

【根据信息充分度的分级写作要求】
用户消息中会明确告知当前信息充分度级别：

▶ 级别：较充分
- summary：可完整描述实验范围、目标、关键表征手段，语言可以稍有信心
- analysis：可基于已记录的测量方法和数据类型讨论可能的分析维度，表述为"可观测到""理论上可用于判断"等，仍不得描述具体结果
- conclusion：可回应实验目标，表述为"初步支持"或"有望验证"，需注明"有待实际数据验证"

▶ 级别：部分充分
- summary：保守描述，重点放在"已完成什么"而非"预期什么"
- analysis：必须明确表达"当前支持有限"，用"初步判断""仅能做记录层面的推断"等保守表述
- conclusion：必须标注"阶段性""待进一步验证"，不得写正向结果性判断

▶ 级别：明显不足
- summary：只描述已记录的基础信息，不做推断
- analysis：只做记录性总结，明确写"当前记录尚不支持结果分析"，说明缺少什么
- conclusion：明确写"当前信息不足以形成有支撑的结论"，给出需补充的方向

【写作风格要求】
- 语言：学术中文，简洁克制，面向导师阅读，不夸张，不营销
- 每个区块控制在 2-4 句话；必要时可适当展开，但避免冗长
- 结论必须回应实验目标：即便信息不足，也要说明"对目标 X 当前支撑程度"

【输出格式 — 严格 JSON，不得有其他内容】
{
  "summary": "string",
  "analysis": "string",
  "conclusion": "string",
  "evidenceLevel": "high" | "medium" | "low",
  "missingInfoHints": ["string", ...] (0-3条，告知用户应补充什么)
}`;

interface AiReportBlocks {
  summary: string;
  analysis: string;
  conclusion: string;
  evidenceLevel?: EvidenceLevel;
  missingInfoHints?: string[];
}

function buildExperimentPrompt(
  model: ExperimentReportModel,
  ctx: ExperimentAiContext,
): string {
  const lines: string[] = [];

  // ── 1. Evidence level assessment (computed by backend)
  lines.push(`【信息充分度评估（后端预判）】`);
  lines.push(`级别：${ctx.evidenceLevelLabel}`);
  if (ctx.backendMissingHints.length > 0) {
    lines.push(`缺失项：${ctx.backendMissingHints.join("；")}`);
  }
  lines.push("");

  // ── 2. Basic experiment info
  lines.push(`【实验基本信息】`);
  lines.push(`名称：${model.title || "（未命名）"}`);
  if (model.experimentType) lines.push(`类型：${model.experimentType}`);
  if (model.objective) {
    lines.push(`目标：${model.objective}`);
  } else {
    lines.push(`目标：（未填写 — 结论不得强行闭环判断）`);
  }
  lines.push("");

  // ── 3. User free text (purpose_input + editor_content)
  if (ctx.userFreeText) {
    lines.push(`【用户自由文字（实验目的补充 & 笔记摘录）】`);
    lines.push(ctx.userFreeText);
    lines.push("");
  }

  // ── 4. System objects (with attributes)
  if (ctx.systemDetails.length > 0) {
    lines.push(`【实验系统】（${model.systemSummary.totalObjects} 个研究对象）`);
    for (const obj of ctx.systemDetails) {
      const attrStr = obj.attrs.length > 0
        ? "  " + obj.attrs.map((a) => `${a.key}: ${a.value}`).join(" | ")
        : "";
      lines.push(`  · ${obj.name}【${obj.role}】${attrStr}`);
    }
    lines.push("");
  }

  // ── 5. Preparation summary
  if (model.preparationSummary.totalItems > 0) {
    lines.push(`【实验准备】（${model.preparationSummary.totalItems} 项）`);
    for (const cat of model.preparationSummary.byCategory) {
      lines.push(`  ${cat.category}：${cat.items.join("、")}`);
    }
    lines.push("");
  }

  // ── 6. Operation steps (ALL params)
  if (ctx.stepDetails.length > 0) {
    lines.push(`【实验过程】（${model.procedureSummary.totalSteps} 步）`);
    for (const step of ctx.stepDetails) {
      const paramsStr = step.params.length > 0
        ? "  参数：" + step.params.map((p) => `${p.key}: ${p.value}`).join("; ")
        : "";
      lines.push(`  ${step.order}. ${step.name}${paramsStr}`);
    }
    lines.push("");
  }

  // ── 7. Measurement methods (with conditions — Phase 3 addition)
  if (ctx.measurementDetails.length > 0) {
    lines.push(`【测量/表征方法】`);
    for (const m of ctx.measurementDetails) {
      let line = `  · ${m.name}（对象：${m.target}`;
      if (m.instrument) line += `；仪器：${m.instrument}`;
      if (m.method) line += `；方式：${m.method}`;
      line += "）";
      if (m.conditions.length > 0) {
        line += "\n    条件：" + m.conditions.map((c) => `${c.key}: ${c.value}`).join("；");
      }
      lines.push(line);
    }
    lines.push("");
  } else {
    lines.push(`【测量/表征方法】（未填写 — analysis 不得推断测量结果）`);
    lines.push("");
  }

  // ── 8. Data types (ALL attributes — Phase 3 addition)
  if (ctx.dataDetails.length > 0) {
    lines.push(`【数据类型记录】`);
    for (const d of ctx.dataDetails) {
      const attrStr = d.attrs.length > 0
        ? "（" + d.attrs.map((a) => `${a.key}: ${a.value}`).join("；") + "）"
        : "";
      lines.push(`  · ${d.name}${attrStr}`);
    }
    lines.push("");
  } else {
    lines.push(`【数据类型记录】（未填写 — conclusion 不得描述数据结果）`);
    lines.push("");
  }

  // ── 9. Explicit generation instructions per tier
  lines.push(`【本次生成要求】`);
  lines.push(`当前信息充分度为「${ctx.evidenceLevelLabel.split("（")[0]}」，请按以下要求生成：`);
  if (ctx.evidenceLevel === "high") {
    lines.push("- summary：完整描述实验范围、目标、主要表征手段，可适度有信心");
    lines.push("- analysis：基于测量方法和数据类型讨论分析维度，可写\"可观测到\"\"用于判断\"，但不得描述具体数值");
    lines.push("- conclusion：回应实验目标，可写\"初步支持\"\"有望验证\"，但需注明\"有待实际数据验证\"");
  } else if (ctx.evidenceLevel === "medium") {
    lines.push("- summary：保守描述，聚焦\"已完成什么\"");
    lines.push("- analysis：必须写\"当前支持有限\"\"仅能做初步判断\"");
    lines.push("- conclusion：必须标注\"阶段性\"\"待进一步验证\"，不得写正向结果性断言");
  } else {
    lines.push("- summary：只描述已记录的基础信息，不做推断");
    lines.push("- analysis：只做记录性总结，明确写\"当前记录尚不支持结果分析\"");
    lines.push("- conclusion：明确写\"当前信息不足以形成有支撑的结论\"");
  }
  lines.push("- 禁止出现虚构数值、伪趋势、对照结论");
  lines.push("");
  lines.push("请输出 JSON 格式，包含 summary / analysis / conclusion / evidenceLevel / missingInfoHints。");

  return lines.join("\n");
}

function validateAiBlocks(data: unknown): data is AiReportBlocks {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d["summary"] !== "string") return false;
  if (typeof d["analysis"] !== "string") return false;
  if (typeof d["conclusion"] !== "string") return false;
  // Optional fields — accept if present and correct type
  if (d["evidenceLevel"] !== undefined && !["high", "medium", "low"].includes(d["evidenceLevel"] as string)) return false;
  if (d["missingInfoHints"] !== undefined && !Array.isArray(d["missingInfoHints"])) return false;
  return true;
}

async function callAiForReportBlocks(
  model: ExperimentReportModel,
  ctx: ExperimentAiContext,
  experimentId: string,
): Promise<AiReportBlocks | null> {
  const config = buildProviderConfig();
  if (!config) {
    console.warn(`[exp-report] ${experimentId}: no AI provider configured`);
    return null;
  }

  const userMessage = buildExperimentPrompt(model, ctx);
  let rawJson: string;
  try {
    console.info(`[exp-report] ${experimentId}: calling AI (${config.model}), evidenceLevel=${ctx.evidenceLevel}`);
    rawJson = await callChatJson(config, EXPERIMENT_REPORT_SYSTEM_PROMPT, userMessage, 60_000);
  } catch (err) {
    console.warn(`[exp-report] ${experimentId}: AI call failed —`, err instanceof Error ? err.message : err);
    return null;
  }

  let parsed: unknown;
  try { parsed = JSON.parse(rawJson); } catch {
    console.warn(`[exp-report] ${experimentId}: AI returned non-JSON —`, rawJson.slice(0, 200));
    return null;
  }

  if (!validateAiBlocks(parsed)) {
    console.warn(`[exp-report] ${experimentId}: AI JSON missing required fields —`, rawJson.slice(0, 200));
    return null;
  }

  console.info(`[exp-report] ${experimentId}: AI generation succeeded (evidenceLevel=${(parsed as AiReportBlocks).evidenceLevel ?? "not returned"})`);
  return parsed as AiReportBlocks;
}

// ---------------------------------------------------------------------------
// Tier-aware fallback text (when AI is unavailable or fails)
// ---------------------------------------------------------------------------

function buildFallbackBlocks(evidenceLevel: EvidenceLevel, missingHints: string[]): AiReportBlocks {
  const hintNote = missingHints.length > 0
    ? ` 当前缺少：${missingHints.slice(0, 2).join("；")}。`
    : "";

  if (evidenceLevel === "high") {
    return {
      summary:    "实验已完成主要步骤，记录较为完整，包含测量方法和数据类型等关键信息。具体分析请在数据整理后补充。",
      analysis:   `当前记录包含测量方法和数据类型信息，具备初步分析的基础，但尚无实测结果数据，暂无法给出具体结论。建议在实验数据获取后重新生成报告。${hintNote}`,
      conclusion: "本实验已完成关键操作步骤及表征方案部署，初步判断实验进展符合预期方向，但结论有待实际数据支撑。",
    };
  }
  if (evidenceLevel === "medium") {
    return {
      summary:    "实验已记录部分过程信息，当前报告为阶段性总结，仍需进一步完善实验记录。",
      analysis:   `当前实验记录支持有限，尚不能做完整结果分析。${hintNote} 建议补充完整测量条件和数据类型后重新生成。`,
      conclusion: `当前信息尚不足以形成有充分支撑的结论，本报告为阶段性记录。${hintNote}`,
    };
  }
  return {
    summary:    "实验基本信息已创建，但当前记录尚不完整，建议补充实验系统、操作步骤和测量信息后重新生成。",
    analysis:   `当前记录尚不支持结果分析。${hintNote} 请完善实验记录后重新生成报告。`,
    conclusion: `当前信息明显不足，无法形成有效结论。${hintNote}`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ExperimentReportResult {
  html: string;
  source: "ai" | "stub";
  generatedAt: string;
  modelJson: string;
}

/**
 * generateAndSaveReport
 *
 * Full pipeline: read experiment → compute evidence level → map → AI → render → save → return.
 * Throws on DB read errors or ownership violations.
 * AI failure is handled gracefully (falls back to tier-aware placeholder text).
 *
 * @param experimentId  The experiment_records.id
 * @param userId        The authenticated user — used for ownership check
 */
export async function generateAndSaveReport(
  experimentId: string,
  userId: string,
): Promise<ExperimentReportResult> {
  // 1. Fetch experiment row + scinote metadata + editor content
  const result = await pool.query<ExperimentDbRow>(
    `SELECT
       e.id,
       e.title,
       e.purpose_input,
       e.editor_content,
       e.current_modules::text AS current_modules,
       s.experiment_type,
       s.objective
     FROM experiment_records e
     JOIN scinotes s ON s.id = e.sci_note_id
     WHERE e.id = $1
       AND e.is_deleted = false
       AND s.user_id = $2`,
    [experimentId, userId],
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error("Experiment not found or access denied"), { status: 404 });
  }

  const row = result.rows[0];

  // 2. Parse modules for evidence assessment
  let modules: OntologyModule[] = [];
  try {
    modules = row.current_modules ? (JSON.parse(row.current_modules) as OntologyModule[]) : [];
  } catch { /* ignore */ }

  const sd = (key: string): OntologyModuleStructuredData =>
    modules.find((m) => m.key === key)?.structuredData ?? {};

  const measurementItems = sd("measurement").measurementItems ?? [];
  const dataItems        = sd("data").dataItems               ?? [];
  const operationSteps   = sd("operation").operationSteps     ?? [];
  const systemObjects    = sd("system").systemObjects         ?? [];

  // 3. Compute evidence level and missing hints (before AI call)
  const evidenceLevel   = computeEvidenceLevel(
    row.objective,
    measurementItems.length,
    dataItems.length,
    operationSteps.length,
    systemObjects.length,
  );
  const backendMissingHints = computeMissingHints(
    row.objective,
    measurementItems.length,
    dataItems.length,
    operationSteps.length,
    systemObjects.length,
  );

  console.info(`[exp-report] ${experimentId}: evidenceLevel=${evidenceLevel}, missingHints=${backendMissingHints.length}`);

  // 4. Map to report model (renderer data)
  const model = mapToReportModel(row, evidenceLevel, backendMissingHints);

  // 5. Build AI context (extended data for prompt)
  const aiContext = extractAiContext(row, evidenceLevel, backendMissingHints, modules);

  // 6. Call AI for 3 blocks (graceful fallback on failure)
  const aiBlocks = await callAiForReportBlocks(model, aiContext, experimentId);

  if (aiBlocks) {
    model.aiSummary          = aiBlocks.summary;
    model.aiAnalysis         = aiBlocks.analysis;
    model.aiConclusion       = aiBlocks.conclusion;
    model.aiEvidenceLevel    = aiBlocks.evidenceLevel;
    model.aiMissingInfoHints = Array.isArray(aiBlocks.missingInfoHints)
      ? aiBlocks.missingInfoHints.filter((h): h is string => typeof h === "string").slice(0, 3)
      : undefined;
    model.source = "ai";
  } else {
    // Tier-aware fallback
    const fallback = buildFallbackBlocks(evidenceLevel, backendMissingHints);
    model.aiSummary    = fallback.summary;
    model.aiAnalysis   = fallback.analysis;
    model.aiConclusion = fallback.conclusion;
    model.source = "stub";
  }

  // 7. Render HTML
  const html        = renderReportModel(model);
  const generatedAt = model.generatedAt;
  const source      = model.source;

  // 8. Persist to DB.
  //
  // report_model_json is saved here as an AUDIT SNAPSHOT of the generation run:
  // it reflects the rule-mapped model + AI text at the moment of generation.
  // After a subsequent manual edit (PUT /report), report_model_json is NOT
  // updated — report_html becomes the truth source and report_model_json
  // serves only for debugging / auditing the AI generation output.
  // Never use report_model_json as a re-render source in production code.
  const modelJson = JSON.stringify(model);
  await pool.query(
    `UPDATE experiment_records
     SET report_html         = $1,
         report_source       = $2,
         report_generated_at = $3,
         report_updated_at   = $3,
         report_model_json   = $4::jsonb,
         updated_at          = now()
     WHERE id = $5`,
    [html, source, generatedAt, modelJson, experimentId],
  );

  console.info(`[exp-report] ${experimentId}: saved — source=${source}, evidenceLevel=${evidenceLevel}`);
  return { html, source, generatedAt, modelJson };
}

/**
 * saveReportHtml
 *
 * Persist a manually edited report HTML with the correct source transition:
 *
 *   'ai'         → 'ai_modified'   (user edited a pure-AI report)
 *   'stub'       → 'ai_modified'   (user edited a fallback/stub report)
 *   'ai_modified'→ 'ai_modified'   (remains modified — no double-label needed)
 *   'manual'/NULL→ 'manual'        (user wrote from scratch or saved already-manual)
 *
 * report_model_json is intentionally NOT updated here. It remains as the
 * audit snapshot of the last AI-generation run. After a manual edit the
 * report_html is the truth source; report_model_json is a historical record
 * of what the AI produced and must NOT be used for re-rendering or display.
 */
export async function saveReportHtml(
  experimentId: string,
  userId: string,
  html: string,
): Promise<void> {
  const result = await pool.query(
    `UPDATE experiment_records
     SET report_html       = $1,
         report_source     = CASE
                               WHEN report_source IN ('ai', 'stub', 'ai_modified')
                               THEN 'ai_modified'
                               ELSE 'manual'
                             END,
         report_updated_at = now(),
         updated_at        = now()
     WHERE id = $2
       AND is_deleted = false
       AND sci_note_id IN (SELECT id FROM scinotes WHERE user_id = $3)`,
    [html, experimentId, userId],
  );
  if (result.rowCount === 0) {
    throw Object.assign(new Error("Experiment not found or access denied"), { status: 404 });
  }
}

/**
 * clearReport
 *
 * Clear all report fields, resetting the experiment to idle report status.
 */
export async function clearReport(
  experimentId: string,
  userId: string,
): Promise<void> {
  const result = await pool.query(
    `UPDATE experiment_records
     SET report_html         = NULL,
         report_source       = NULL,
         report_generated_at = NULL,
         report_updated_at   = NULL,
         report_model_json   = NULL,
         updated_at          = now()
     WHERE id = $1
       AND is_deleted = false
       AND sci_note_id IN (SELECT id FROM scinotes WHERE user_id = $2)`,
    [experimentId, userId],
  );
  if (result.rowCount === 0) {
    throw Object.assign(new Error("Experiment not found or access denied"), { status: 404 });
  }
}
