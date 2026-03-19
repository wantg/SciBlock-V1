/**
 * experiment-report.service.ts
 *
 * Phase 2 experiment report generation pipeline.
 *
 * Chain:
 *   DB experiment record
 *   → mapExperimentToReportModel()   (local TypeScript mapper, ported from frontend)
 *   → AI generates summary / analysis / conclusion  (qwen-plus / OpenAI fallback)
 *   → merge AI text into report model
 *   → renderReportModel()            (local renderer, ported from frontend)
 *   → persist to DB (report_html, report_source, report_generated_at, report_model_json)
 *   → return ExperimentReportResult
 *
 * Design constraints:
 *   - AI only generates 3 blocks: summary, analysis, conclusion.
 *   - All other sections come from the rule-based mapper (same logic as frontend Phase 1).
 *   - AI failure → graceful fallback to placeholder text (same as Phase 1).
 *   - The renderer assembles the final HTML from the merged model.
 *   - DB access is via pg pool directly (same pattern as report-generation.service.ts).
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
  current_modules: string | null; // JSON string of OntologyModule[]
  experiment_type: string | null; // from scinotes.experiment_type
  objective: string | null;       // from scinotes.objective
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
  id: string; name: string; instrument?: string; method?: string; target: string; conditions: Tag[];
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
  // AI-generated fields (override placeholders when present)
  aiSummary?: string;
  aiAnalysis?: string;
  aiConclusion?: string;
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
// Mapper — same logic as artifacts/web/src/utils/reportMapper.ts
// ---------------------------------------------------------------------------

function mapToReportModel(row: ExperimentDbRow): ExperimentReportModel {
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

  // reportSummary — template-based (overridden by AI when available)
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

  // systemSummary
  const coreObjects = systemObjects.slice(0, MAX_SYSTEM_OBJECTS).map((obj) => ({
    name: obj.name,
    role: obj.role,
    keyAttribute: obj.attributes.length > 0 ? `${obj.attributes[0].key}：${obj.attributes[0].value}` : undefined,
  }));

  // preparationSummary
  const catMap = new Map<string, string[]>();
  for (const item of prepItems) {
    const cat = item.category?.trim() || "其他";
    if (!catMap.has(cat)) catMap.set(cat, []);
    const bucket = catMap.get(cat)!;
    if (bucket.length < MAX_PREP_PER_CAT) bucket.push(item.name);
  }

  // procedureSummary
  const sorted   = [...operationSteps].sort((a, b) => a.order - b.order);
  const keySteps = sorted.slice(0, MAX_PROCEDURE_STEPS).map((step) => ({
    order: step.order, name: step.name,
    keyParam: step.params.length > 0 ? `${step.params[0].key}：${step.params[0].value}` : undefined,
  }));

  // measurementDataSummary
  const methods   = measurementItems.slice(0, MAX_MEASUREMENTS).map((item) => ({ name: item.name, target: item.target, instrument: item.instrument }));
  const dataTypes = dataItems.slice(0, MAX_DATA_TYPES).map((item) => ({
    name: item.name,
    unit: item.attributes.find((a) => a.key === "单位")?.value,
  }));

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
    findingsPlaceholder: "本区块将在下一阶段基于实验数据、测量结果和对照信息自动生成分析内容，当前可由用户手动补充。",
    conclusionPlaceholder: "本区块为结论占位，将在下一阶段基于结果分析和实验目标自动生成初步结论，当前可由用户手动补充。",
    generatedAt: new Date().toISOString(),
    source: "ai",
  };
}

// ---------------------------------------------------------------------------
// Renderer — same logic as artifacts/web/src/utils/reportRenderer.ts
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
  const findingsLines = [`<h2>${sectionNum(sections, "findings")}、结果分析</h2>`];
  if (analysisText) {
    findingsLines.push(`<p>${esc(analysisText)}</p>`);
  } else {
    findingsLines.push(`<p class="report-placeholder">${esc(m.findingsPlaceholder)}</p>`);
    findingsLines.push("<p>（可在编辑报告模式下直接补充分析内容）</p>");
  }
  blocks.push(findingsLines.join("\n"));

  // 实验结论 (AI or placeholder)
  const conclusionText = m.aiConclusion;
  const concLines = [`<h2>${sectionNum(sections, "conclusion")}、实验结论</h2>`];
  if (conclusionText) {
    concLines.push(`<p>${esc(conclusionText)}</p>`);
  } else {
    concLines.push(`<p class="report-placeholder">${esc(m.conclusionPlaceholder)}</p>`);
  }
  blocks.push(concLines.join("\n"));

  return blocks.join("\n");
}

// ---------------------------------------------------------------------------
// AI generation — calls LLM for 3 blocks only
// ---------------------------------------------------------------------------

const EXPERIMENT_REPORT_SYSTEM_PROMPT = `你是一位科研实验室报告助理。根据用户提供的实验信息，生成实验报告中的三个核心区块。

【核心原则】
1. 只能基于用户提供的实验记录生成内容。严禁补充、推断或编造不存在于原始记录中的实验结论、趋势或数据。
2. 当实验记录信息不足时，应保守表达（如"暂无明显数据支撑"、"信息尚不充分"），不得猜测。
3. 语言专业简洁，面向科研导师阅读。中文输出。

【输出格式】
你必须严格输出以下 JSON 结构，所有字段必须存在：
{
  "summary": "string — 实验概述，2-3句话描述实验整体情况和主要工作",
  "analysis": "string — 结果分析，基于已记录的测量方法和数据类型，描述可能的分析方向和关注点。信息不足时写'当前实验数据尚未完整记录，建议补充后重新生成报告。'",
  "conclusion": "string — 初步结论，基于实验目标和已完成工作，给出初步判断。信息不足时写'实验尚在进行中，结论待补充。'"
}`;

interface AiReportBlocks {
  summary: string;
  analysis: string;
  conclusion: string;
}

function buildExperimentPrompt(model: ExperimentReportModel): string {
  const lines: string[] = [
    `【实验基本信息】`,
    `实验名称：${model.title || "（未命名）"}`,
    model.experimentType ? `实验类型：${model.experimentType}` : "",
    model.objective ? `实验目标：${model.objective}` : "",
    "",
    `【实验系统】（${model.systemSummary.totalObjects} 个研究对象）`,
  ];

  for (const obj of model.systemSummary.coreObjects) {
    lines.push(`  · ${obj.name}【${obj.role}】${obj.keyAttribute ? "  " + obj.keyAttribute : ""}`);
  }

  lines.push(`\n【实验准备】（${model.preparationSummary.totalItems} 项）`);
  for (const cat of model.preparationSummary.byCategory) {
    lines.push(`  ${cat.category}：${cat.items.join("、")}`);
  }

  lines.push(`\n【实验过程】（${model.procedureSummary.totalSteps} 步）`);
  for (const step of model.procedureSummary.keySteps) {
    lines.push(`  ${step.order}. ${step.name}${step.keyParam ? "  (" + step.keyParam + ")" : ""}`);
  }

  lines.push(`\n【测量与数据】`);
  if (model.measurementDataSummary.methods.length > 0) {
    lines.push(`  测量方法：${model.measurementDataSummary.methods.map((m) => m.name + "（" + m.target + "）").join("；")}`);
  }
  if (model.measurementDataSummary.dataTypes.length > 0) {
    lines.push(`  数据类型：${model.measurementDataSummary.dataTypes.map((d) => d.name + (d.unit ? "（" + d.unit + "）" : "")).join("；")}`);
  }

  lines.push("\n请基于以上实验信息，生成 JSON 格式的三个报告区块。");
  return lines.filter((l) => l !== "").join("\n");
}

function validateAiBlocks(data: unknown): data is AiReportBlocks {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d["summary"] === "string" && typeof d["analysis"] === "string" && typeof d["conclusion"] === "string";
}

async function callAiForReportBlocks(
  model: ExperimentReportModel,
  experimentId: string,
): Promise<AiReportBlocks | null> {
  const config = buildProviderConfig();
  if (!config) {
    console.warn(`[exp-report] ${experimentId}: no AI provider configured`);
    return null;
  }

  const userMessage = buildExperimentPrompt(model);
  let rawJson: string;
  try {
    console.info(`[exp-report] ${experimentId}: calling AI (${config.model})`);
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

  console.info(`[exp-report] ${experimentId}: AI generation succeeded`);
  return parsed;
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
 * Full pipeline: read experiment → map → AI → render → save → return.
 * Throws on DB read errors or ownership violations.
 * AI failure is handled gracefully (falls back to placeholder text for findings/conclusion).
 *
 * @param experimentId  The experiment_records.id
 * @param userId        The authenticated user — used for ownership check
 */
export async function generateAndSaveReport(
  experimentId: string,
  userId: string,
): Promise<ExperimentReportResult> {
  // 1. Fetch experiment row + scinote metadata (ownership check via user_id)
  const result = await pool.query<ExperimentDbRow>(
    `SELECT
       e.id,
       e.title,
       e.purpose_input,
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

  // 2. Map to report model
  const model = mapToReportModel(row);

  // 3. Call AI for 3 blocks (graceful fallback on failure)
  const aiBlocks = await callAiForReportBlocks(model, experimentId);
  if (aiBlocks) {
    model.aiSummary    = aiBlocks.summary;
    model.aiAnalysis   = aiBlocks.analysis;
    model.aiConclusion = aiBlocks.conclusion;
    model.source       = "ai";
  } else {
    model.source = "stub";
  }

  // 4. Render HTML
  const html        = renderReportModel(model);
  const generatedAt = model.generatedAt;
  const source      = model.source;
  const modelJson   = JSON.stringify(model);

  // 5. Persist to DB.
  //
  // report_model_json is saved here as an AUDIT SNAPSHOT of the generation run:
  // it reflects the rule-mapped model + AI text at the moment of generation.
  // After a subsequent manual edit (PUT /report), report_model_json is NOT
  // updated — report_html becomes the truth source and report_model_json
  // serves only for debugging / auditing the AI generation output.
  // Never use report_model_json as a re-render source in production code.
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

  console.info(`[exp-report] ${experimentId}: saved — source=${source}`);
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
