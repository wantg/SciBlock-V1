/**
 * report-generation.service.ts
 *
 * Handles rule-based AI report content generation.
 *
 * Responsibilities:
 *   - Define all domain types for generated AI content
 *   - Provide `buildAiContent()` to transform raw experiment rows into a
 *     structured AiReportContent object (pure function, no I/O)
 *   - Provide `runReportGeneration()` to execute the full async pipeline:
 *     query experiments → build content → write back to DB
 *
 * Design notes:
 *   - No LLM is called in this phase. Content is derived entirely from
 *     experiment record fields (title, status, purpose_input, current_modules).
 *   - The AiReportContent data contract is final-form. Switching to a real
 *     LLM later only requires replacing `buildAiContent()` body — no consumer
 *     code changes needed.
 *   - `runReportGeneration()` is called via `setImmediate` from the route
 *     handler AFTER the 202 response has already been sent. It must be fully
 *     self-contained and must never throw unhandled exceptions.
 */

import { db, pool } from "@workspace/db";
import { weeklyReportsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Raw DB row types (scoped to generation — not exposed to route layer)
// ---------------------------------------------------------------------------

interface ExperimentRow {
  id: string;
  sci_note_id: string;
  sci_note_title: string;
  title: string;
  experiment_status: string;
  purpose_input: string | null;
  current_modules: string | null;
  created_at: Date;
}

interface AiModuleItem {
  key: string;
  title: string;
  status: "inherited" | "confirmed";
}

// ---------------------------------------------------------------------------
// AiReportContent — the structured output written to `ai_content_json`
// ---------------------------------------------------------------------------

export interface AiReportContent {
  summary: string;
  theme: string;
  projectSummary: Array<{
    sciNoteId: string;
    sciNoteTitle: string;
    experimentCount: number;
  }>;
  statusDistribution: {
    exploring: number;
    reproducible: number;
    verified: number;
    failed: number;
    total: number;
    conclusion: string;
  };
  parameterChanges: Array<{
    paramName: string;
    changeDescription: string;
    relatedExperiments: string[];
    impact: string;
  }>;
  operationSummary: Array<{ step: string; note?: string }>;
  resultsTrends: Array<{
    direction: string;
    finding: string;
    hasClearTrend: boolean;
    relatedExperiments: string[];
  }>;
  provenanceExperiments: Array<{
    id: string;
    title: string;
    sciNoteId: string;
    sciNoteTitle: string;
    date: string;
    status: string;
  }>;
}

// ---------------------------------------------------------------------------
// Module label map — configure new experiment module types here
// ---------------------------------------------------------------------------

const MODULE_KEY_LABELS: Record<string, string> = {
  system:      "系统配置",
  preparation: "样品制备",
  operation:   "实验操作",
  measurement: "测量分析",
  data:        "数据处理",
};

// ---------------------------------------------------------------------------
// buildAiContent — pure transformation, no side effects
// ---------------------------------------------------------------------------

/**
 * Transforms a list of experiment rows into a structured AiReportContent
 * object. This is a pure function: given the same input, it always returns
 * the same output with no I/O or external dependencies.
 *
 * To upgrade to LLM-backed generation: replace this function body.
 * All call sites (runReportGeneration) remain unchanged.
 *
 * @param experiments Experiment rows queried for the report's date range
 * @returns Structured AI report content
 */
export function buildAiContent(experiments: ExperimentRow[]): AiReportContent {
  const total = experiments.length;

  // --- 1. Status distribution ---
  const dist = { exploring: 0, reproducible: 0, verified: 0, failed: 0 };
  for (const e of experiments) {
    if      (e.experiment_status === "探索中")  dist.exploring++;
    else if (e.experiment_status === "可复现") dist.reproducible++;
    else if (e.experiment_status === "已验证") dist.verified++;
    else if (e.experiment_status === "失败")   dist.failed++;
  }

  const successCount = dist.verified + dist.reproducible;
  let conclusion: string;
  if (total === 0) {
    conclusion = "本时间段无实验记录。";
  } else if (successCount === 0) {
    conclusion = `共 ${total} 条实验均处于探索或失败阶段，尚无可复现结果，建议梳理实验参数后继续推进。`;
  } else {
    const rate = Math.round((successCount / total) * 100);
    conclusion = `${successCount}/${total} 条实验达到可复现或已验证状态（${rate}%），整体进展良好。`;
  }

  // --- 2. Project summary (group by SciNote) ---
  const sciNoteMap = new Map<string, { title: string; count: number }>();
  for (const e of experiments) {
    const entry = sciNoteMap.get(e.sci_note_id);
    if (entry) {
      entry.count++;
    } else {
      sciNoteMap.set(e.sci_note_id, { title: e.sci_note_title, count: 1 });
    }
  }
  const projectSummary = Array.from(sciNoteMap.entries()).map(([id, v]) => ({
    sciNoteId: id,
    sciNoteTitle: v.title,
    experimentCount: v.count,
  }));

  // --- 3. Theme — derived from purpose_input values ---
  const purposes = experiments
    .map((e) => e.purpose_input)
    .filter((p): p is string => Boolean(p && p.trim()));
  let theme: string;
  if (purposes.length === 0) {
    theme = "实验探索与参数优化";
  } else if (purposes.length === 1) {
    theme = purposes[0].slice(0, 60);
  } else {
    theme = purposes.slice(0, 2).map((p) => p.slice(0, 30)).join("；");
    if (theme.length > 60) theme = theme.slice(0, 60) + "…";
  }

  // --- 4. Summary paragraph ---
  const projectCount = sciNoteMap.size;
  const summary =
    [
      `本时间段共汇总 ${total} 条实验记录，涉及 ${projectCount} 个项目。`,
      dist.verified > 0      ? `其中 ${dist.verified} 条已达到已验证状态。`    : "",
      dist.reproducible > 0  ? `${dist.reproducible} 条达到可复现。`            : "",
      dist.failed > 0        ? `${dist.failed} 条标注为失败，可参考溯源记录进行原因分析。` : "",
    ]
      .filter(Boolean)
      .join("") || "本时间段暂无实验记录，建议选择其他时间范围重新生成。";

  // --- 5. Operation summary — from confirmed ontology modules ---
  const confirmedModuleKeys = new Set<string>();
  for (const e of experiments) {
    if (!e.current_modules) continue;
    try {
      const modules = JSON.parse(e.current_modules) as AiModuleItem[];
      for (const m of modules) {
        if (m.status === "confirmed") confirmedModuleKeys.add(m.key);
      }
    } catch {
      // ignore malformed JSON in current_modules
    }
  }

  const operationSummary: AiReportContent["operationSummary"] = Array.from(confirmedModuleKeys)
    .filter((k) => MODULE_KEY_LABELS[k])
    .map((k) => ({
      step: MODULE_KEY_LABELS[k],
      note: `${
        experiments.filter((e) => {
          try {
            const mods = JSON.parse(e.current_modules ?? "[]") as AiModuleItem[];
            return mods.some((m) => m.key === k && m.status === "confirmed");
          } catch {
            return false;
          }
        }).length
      } 条实验已确认此环节`,
    }));

  if (operationSummary.length === 0) {
    operationSummary.push({ step: "实验流程", note: "各实验环节暂未填写详细信息" });
  }

  // --- 6. Parameter changes — group experiments by status pattern per SciNote ---
  const parameterChanges: AiReportContent["parameterChanges"] = [];
  for (const [sciNoteId, v] of sciNoteMap.entries()) {
    const noteExps = experiments.filter((e) => e.sci_note_id === sciNoteId);
    if (noteExps.length < 2) continue;

    const statuses     = noteExps.map((e) => e.experiment_status);
    const uniqueStatuses = [...new Set(statuses)];

    if (uniqueStatuses.length > 1) {
      parameterChanges.push({
        paramName:         v.title + " 实验参数",
        changeDescription: `在 ${v.title} 中进行了 ${noteExps.length} 轮实验，出现 ${uniqueStatuses.join(" / ")} 等不同状态结果`,
        relatedExperiments: noteExps.map((e) => e.title),
        impact: uniqueStatuses.includes("已验证") || uniqueStatuses.includes("可复现")
          ? "部分参数配置已取得可复现结果"
          : "当前参数配置仍处于探索阶段",
      });
    }
  }

  if (parameterChanges.length === 0 && total > 0) {
    parameterChanges.push({
      paramName:          "实验参数",
      changeDescription:  `本时间段共进行 ${total} 条实验，详细参数变化请参考溯源记录`,
      relatedExperiments: experiments.map((e) => e.title),
      impact:             "请查阅各实验记录的本体模块信息获取参数细节",
    });
  }

  // --- 7. Results & trends ---
  const resultsTrends: AiReportContent["resultsTrends"] = [];

  if (dist.verified > 0) {
    resultsTrends.push({
      direction:          "已验证实验",
      finding:            `${dist.verified} 条实验达到已验证状态，结论稳定可参考。`,
      hasClearTrend:      true,
      relatedExperiments: experiments.filter((e) => e.experiment_status === "已验证").map((e) => e.title),
    });
  }
  if (dist.reproducible > 0) {
    resultsTrends.push({
      direction:          "可复现实验",
      finding:            `${dist.reproducible} 条实验已可复现，建议进一步验证稳定性。`,
      hasClearTrend:      true,
      relatedExperiments: experiments.filter((e) => e.experiment_status === "可复现").map((e) => e.title),
    });
  }
  if (dist.failed > 0) {
    resultsTrends.push({
      direction:          "失败实验",
      finding:            `${dist.failed} 条实验标注为失败，建议结合溯源记录分析失败原因。`,
      hasClearTrend:      false,
      relatedExperiments: experiments.filter((e) => e.experiment_status === "失败").map((e) => e.title),
    });
  }
  if (dist.exploring > 0) {
    resultsTrends.push({
      direction:          "探索中实验",
      finding:            `${dist.exploring} 条实验仍处于探索阶段，暂未观察到稳定趋势。`,
      hasClearTrend:      false,
      relatedExperiments: experiments.filter((e) => e.experiment_status === "探索中").map((e) => e.title),
    });
  }

  // --- 8. Provenance ---
  const provenanceExperiments = experiments.map((e) => ({
    id:            e.id,
    title:         e.title,
    sciNoteId:     e.sci_note_id,
    sciNoteTitle:  e.sci_note_title,
    date:          (e.created_at instanceof Date ? e.created_at : new Date(e.created_at))
                     .toISOString()
                     .slice(0, 10),
    status:        e.experiment_status,
  }));

  return {
    summary,
    theme,
    projectSummary,
    statusDistribution: { ...dist, total, conclusion },
    parameterChanges,
    operationSummary,
    resultsTrends,
    provenanceExperiments,
  };
}

// ---------------------------------------------------------------------------
// fetchExperimentsForGeneration — experiment query strategy
//
// Priority 1: If the report has explicitly linked records (junction table),
//             use those. This is the primary path after the linkage feature.
// Priority 2: Fall back to date-range query (created_at BETWEEN ...) for
//             backward-compat and reports with no links set.
// ---------------------------------------------------------------------------

async function fetchExperimentsForGeneration(
  reportId: string,
  sciNoteUserId: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  /**
   * Timestamp of the last time the student explicitly saved links for this
   * report (can be null for old reports created before the linkage feature).
   *
   * Decision table:
   *   linksLastSavedAt = NULL  → never managed → fallback to date-range OK
   *   linksLastSavedAt ≠ NULL  → student explicitly managed links (even if
   *                              they cleared them to empty) → use links only,
   *                              never fallback. Prevents silent date-range
   *                              injection after a student has taken control.
   */
  linksLastSavedAt: Date | null,
): Promise<ExperimentRow[]> {
  // Check if explicit links exist for this report
  const linksResult = await pool.query<{ experiment_record_id: string }>(
    `SELECT experiment_record_id FROM weekly_report_experiment_links WHERE report_id = $1`,
    [reportId],
  );

  if (linksResult.rows.length > 0) {
    // Use junction table records
    const ids = linksResult.rows.map((r) => r.experiment_record_id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const expResult = await pool.query<ExperimentRow>(
      `SELECT
         e.id,
         e.sci_note_id,
         s.title AS sci_note_title,
         e.title,
         e.experiment_status,
         e.purpose_input,
         e.current_modules,
         e.created_at
       FROM experiment_records e
       JOIN scinotes s ON s.id = e.sci_note_id
       WHERE e.id IN (${placeholders})
         AND e.is_deleted = false
       ORDER BY e.created_at DESC`,
      ids,
    );
    return expResult.rows;
  }

  // Student explicitly managed links but saved an empty set →
  // respect their choice, return empty (do NOT fallback to date range).
  if (linksLastSavedAt !== null) {
    return [];
  }

  // Fall back: date-range query (backward-compat for old reports that
  // have never gone through the links workflow).
  const expResult = await pool.query<ExperimentRow>(
    `SELECT
       e.id,
       e.sci_note_id,
       s.title AS sci_note_title,
       e.title,
       e.experiment_status,
       e.purpose_input,
       e.current_modules,
       e.created_at
     FROM experiment_records e
     JOIN scinotes s ON s.id = e.sci_note_id
     WHERE s.user_id = $1
       AND e.is_deleted = false
       AND e.created_at >= $2::date
       AND e.created_at < ($3::date + interval '1 day')
     ORDER BY e.created_at DESC`,
    [sciNoteUserId, dateRangeStart, dateRangeEnd],
  );
  return expResult.rows;
}

// ---------------------------------------------------------------------------
// runReportGeneration — async pipeline (called after 202 is sent)
//
// Parameters:
//   reportId     — the weekly_reports row to update
//   sciNoteUserId — user_id that owns the scinotes (may differ from the
//                   instructor who triggered generation)
//   dateRangeStart / dateRangeEnd — inclusive date bounds for experiment query
//                                   (used only if no junction table links exist)
// ---------------------------------------------------------------------------

/**
 * Executes the full generation pipeline asynchronously.
 *
 * Must be invoked via `setImmediate` from the route handler so it runs
 * after the HTTP 202 response has been flushed. It is self-contained:
 * all errors are caught internally and written back to the report row as
 * generationStatus = "failed" to allow the frontend to surface them.
 *
 * Source priority:
 *   1. Explicit links in weekly_report_experiment_links (student-selected)
 *   2. Date-range fallback (created_at BETWEEN dateRangeStart AND dateRangeEnd)
 */
export async function runReportGeneration(
  reportId: string,
  sciNoteUserId: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  /** See fetchExperimentsForGeneration for semantics. Pass null for legacy reports. */
  linksLastSavedAt: Date | null,
): Promise<void> {
  try {
    const rows = await fetchExperimentsForGeneration(
      reportId,
      sciNoteUserId,
      dateRangeStart,
      dateRangeEnd,
      linksLastSavedAt,
    );

    const aiContent = buildAiContent(rows);

    await db
      .update(weeklyReportsTable)
      .set({
        generationStatus: "generated",
        aiContentJson:    JSON.stringify(aiContent),
        experimentCount:  rows.length,
        updatedAt:        new Date(),
      })
      .where(eq(weeklyReportsTable.id, reportId));
  } catch (err) {
    console.error("[report-generation] runReportGeneration error:", err);
    try {
      await db
        .update(weeklyReportsTable)
        .set({ generationStatus: "failed", updatedAt: new Date() })
        .where(eq(weeklyReportsTable.id, reportId));
    } catch (updateErr) {
      console.error("[report-generation] failed-status update error:", updateErr);
    }
  }
}
