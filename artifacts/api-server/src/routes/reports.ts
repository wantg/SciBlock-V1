/**
 * 周报路由
 *
 * GET    /reports                     — 按角色分流（student 自己 / instructor 可筛选）
 * GET    /reports/team                — 导师查看全团队周报（按周筛选）
 * GET    /reports/preview             — 预览某时间段内命中的实验（学生自用）
 * GET    /reports/:id                 — 查看单条周报
 * POST   /reports                     — 创建周报
 * POST   /reports/:id/generate        — 触发汇总生成（规则化，异步写入 ai_content_json）
 * PATCH  /reports/:id                 — 更新周报内容 / 状态
 * DELETE /reports/:id                 — 删除周报
 * GET    /reports/:id/comments        — 查看评论
 * POST   /reports/:id/comments        — 添加评论（导师专属；写入后发消息通知学生）
 *
 * 所有路由均受 requireAuth 保护（在 routes/index.ts 统一注册）。
 * 用户身份从 res.locals.userId / role 读取。
 */

import { Router } from "express";
import { db, pool } from "@workspace/db";
import {
  weeklyReportsTable,
  reportCommentsTable,
  studentsTable,
  messagesTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireInstructor } from "../middleware/requireAuth";
import { getStudentByUserId } from "../services/student.service";
import { submitReport } from "../services/report.service";
import { findSubmittedReportsForTeam } from "../repositories/report.repository";

const router = Router();

// ---------------------------------------------------------------------------
// Types for raw SQL result rows
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

interface SciNoteRow {
  id: string;
  title: string;
}

// ---------------------------------------------------------------------------
// AiReportContent builder (MVP: rule-based template generation)
//
// No LLM is called in this phase. Content is derived entirely from
// experiment record fields (title, status, purpose_input, current_modules).
// The data structure is final-form — switching to a real LLM later only
// requires replacing the body of buildAiContent, not any consumer code.
// ---------------------------------------------------------------------------

interface AiModuleItem {
  key: string;
  title: string;
  status: "inherited" | "confirmed";
}

interface AiReportContent {
  summary: string;
  theme: string;
  projectSummary: Array<{ sciNoteId: string; sciNoteTitle: string; experimentCount: number }>;
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

const MODULE_KEY_LABELS: Record<string, string> = {
  system:      "系统配置",
  preparation: "样品制备",
  operation:   "实验操作",
  measurement: "测量分析",
  data:        "数据处理",
};

function buildAiContent(experiments: ExperimentRow[]): AiReportContent {
  const total = experiments.length;

  // --- 1. Status distribution ---
  const dist = { exploring: 0, reproducible: 0, verified: 0, failed: 0 };
  for (const e of experiments) {
    if (e.experiment_status === "探索中")  dist.exploring++;
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

  // --- 2. Project summary ---
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
  const summary = [
    `本时间段共汇总 ${total} 条实验记录，涉及 ${projectCount} 个项目。`,
    dist.verified > 0   ? `其中 ${dist.verified} 条已达到已验证状态。` : "",
    dist.reproducible > 0 ? `${dist.reproducible} 条达到可复现。` : "",
    dist.failed > 0     ? `${dist.failed} 条标注为失败，可参考溯源记录进行原因分析。` : "",
  ].filter(Boolean).join("") ||
    "本时间段暂无实验记录，建议选择其他时间范围重新生成。";

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
      // ignore malformed JSON
    }
  }

  // Present all module categories that appeared as confirmed across experiments
  const operationSummary = Array.from(confirmedModuleKeys)
    .filter((k) => MODULE_KEY_LABELS[k])
    .map((k) => ({
      step: MODULE_KEY_LABELS[k],
      note: `${experiments.filter((e) => {
        try {
          const mods = JSON.parse(e.current_modules ?? "[]") as AiModuleItem[];
          return mods.some((m) => m.key === k && m.status === "confirmed");
        } catch { return false; }
      }).length} 条实验已确认此环节`,
    }));

  if (operationSummary.length === 0) {
    operationSummary.push({ step: "实验流程", note: "各实验环节暂未填写详细信息" });
  }

  // --- 6. Parameter changes — group experiments by status pattern per SciNote ---
  const parameterChanges: AiReportContent["parameterChanges"] = [];
  for (const [sciNoteId, v] of sciNoteMap.entries()) {
    const noteExps = experiments.filter((e) => e.sci_note_id === sciNoteId);
    if (noteExps.length < 2) continue;

    const statuses = noteExps.map((e) => e.experiment_status);
    const uniqueStatuses = [...new Set(statuses)];

    if (uniqueStatuses.length > 1) {
      parameterChanges.push({
        paramName: v.title + " 实验参数",
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
      paramName: "实验参数",
      changeDescription: `本时间段共进行 ${total} 条实验，详细参数变化请参考溯源记录`,
      relatedExperiments: experiments.map((e) => e.title),
      impact: "请查阅各实验记录的本体模块信息获取参数细节",
    });
  }

  // --- 7. Results & trends ---
  const resultsTrends: AiReportContent["resultsTrends"] = [];

  if (dist.verified > 0) {
    const verifiedExps = experiments
      .filter((e) => e.experiment_status === "已验证")
      .map((e) => e.title);
    resultsTrends.push({
      direction: "已验证实验",
      finding: `${dist.verified} 条实验达到已验证状态，结论稳定可参考。`,
      hasClearTrend: true,
      relatedExperiments: verifiedExps,
    });
  }

  if (dist.reproducible > 0) {
    const reprExps = experiments
      .filter((e) => e.experiment_status === "可复现")
      .map((e) => e.title);
    resultsTrends.push({
      direction: "可复现实验",
      finding: `${dist.reproducible} 条实验已可复现，建议进一步验证稳定性。`,
      hasClearTrend: true,
      relatedExperiments: reprExps,
    });
  }

  if (dist.failed > 0) {
    const failedExps = experiments
      .filter((e) => e.experiment_status === "失败")
      .map((e) => e.title);
    resultsTrends.push({
      direction: "失败实验",
      finding: `${dist.failed} 条实验标注为失败，建议结合溯源记录分析失败原因。`,
      hasClearTrend: false,
      relatedExperiments: failedExps,
    });
  }

  if (dist.exploring > 0) {
    resultsTrends.push({
      direction: "探索中实验",
      finding: `${dist.exploring} 条实验仍处于探索阶段，暂未观察到稳定趋势。`,
      hasClearTrend: false,
      relatedExperiments: experiments
        .filter((e) => e.experiment_status === "探索中")
        .map((e) => e.title),
    });
  }

  // --- 8. Provenance ---
  const provenanceExperiments = experiments.map((e) => ({
    id: e.id,
    title: e.title,
    sciNoteId: e.sci_note_id,
    sciNoteTitle: e.sci_note_title,
    date: (e.created_at instanceof Date ? e.created_at : new Date(e.created_at))
      .toISOString()
      .slice(0, 10),
    status: e.experiment_status,
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
// GET /reports
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const role = res.locals.role as string;

  if (role === "student") {
    let student;
    try {
      student = await getStudentByUserId(res.locals.userId);
    } catch (err) {
      console.error("[reports] GET / student lookup error:", err);
      res.status(500).json({ message: "Failed to resolve student profile" });
      return;
    }
    if (!student) {
      res.status(409).json({
        error: "no_student_binding",
        message: "Your account is not linked to a student profile. Please contact your instructor.",
      });
      return;
    }

    try {
      const reports = await db
        .select()
        .from(weeklyReportsTable)
        .where(eq(weeklyReportsTable.studentId, student.id))
        .orderBy(desc(weeklyReportsTable.weekStart));
      res.json(reports);
    } catch (err) {
      console.error("[reports] GET / (student) fetch error:", err);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
    return;
  }

  // Instructor path
  const { studentId } = req.query as { studentId?: string };
  try {
    const reports = studentId
      ? await db
          .select()
          .from(weeklyReportsTable)
          .where(eq(weeklyReportsTable.studentId, studentId))
          .orderBy(desc(weeklyReportsTable.weekStart))
      : await db
          .select()
          .from(weeklyReportsTable)
          .orderBy(desc(weeklyReportsTable.weekStart));
    res.json(reports);
  } catch (err) {
    console.error("[reports] GET / (instructor) fetch error:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// ---------------------------------------------------------------------------
// GET /reports/team
//
// Returns all active students paired with their submitted reports for the
// given week. Draft reports are intentionally excluded: students control
// when they share work with their instructor by submitting.
// ---------------------------------------------------------------------------
router.get("/team", requireInstructor, async (req, res) => {
  const { weekStart } = req.query as { weekStart?: string };
  try {
    const students = await db.select().from(studentsTable).orderBy(studentsTable.name);
    const reports = await findSubmittedReportsForTeam(weekStart);
    res.json({ students, reports });
  } catch (err) {
    console.error("[reports] GET /team error:", err);
    res.status(500).json({ message: "Failed to fetch team reports" });
  }
});

// ---------------------------------------------------------------------------
// GET /reports/preview?dateStart=YYYY-MM-DD&dateEnd=YYYY-MM-DD
//
// Returns experiments that would be included in an AI-generated report
// for the given date range. Student role only — uses JWT to derive user_id,
// then queries scinotes owned by that user and experiment_records within range.
//
// Filters:
//   - is_deleted = false
//   - All experiment statuses included
//   - created_at between dateStart (inclusive) and dateEnd (inclusive, end-of-day)
//   - Ordered by created_at DESC
// ---------------------------------------------------------------------------
router.get("/preview", async (req, res) => {
  const role = res.locals.role as string;

  let userId: string;
  if (role === "student") {
    userId = res.locals.userId;
  } else {
    // Instructors can preview a specific student's scope via ?studentUserId=
    const { studentUserId } = req.query as { studentUserId?: string };
    if (!studentUserId) {
      res.status(400).json({ message: "studentUserId query param is required for instructor role" });
      return;
    }
    userId = studentUserId;
  }

  const { dateStart, dateEnd } = req.query as { dateStart?: string; dateEnd?: string };
  if (!dateStart || !dateEnd) {
    res.status(400).json({ message: "dateStart and dateEnd are required" });
    return;
  }

  try {
    // Query experiments across all scinotes owned by this user in the date range.
    // We query the Go API's tables directly (shared PostgreSQL) because the
    // experiment data lives there and we don't want an HTTP hop per request.
    const result = await pool.query<ExperimentRow>(
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
      [userId, dateStart, dateEnd],
    );

    const experiments = result.rows;

    // Build project summary for the preview response
    const sciNoteMap = new Map<string, { title: string; count: number }>();
    for (const e of experiments) {
      const entry = sciNoteMap.get(e.sci_note_id);
      if (entry) entry.count++;
      else sciNoteMap.set(e.sci_note_id, { title: e.sci_note_title, count: 1 });
    }

    res.json({
      experimentCount: experiments.length,
      sciNoteCount: sciNoteMap.size,
      experiments: experiments.map((e) => ({
        id: e.id,
        title: e.title,
        sciNoteId: e.sci_note_id,
        sciNoteTitle: e.sci_note_title,
        status: e.experiment_status,
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    console.error("[reports] GET /preview error:", err);
    res.status(500).json({ message: "Failed to fetch preview" });
  }
});

// ---------------------------------------------------------------------------
// GET /reports/:id
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [report] = await db
      .select()
      .from(weeklyReportsTable)
      .where(eq(weeklyReportsTable.id, id))
      .limit(1);
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    res.json(report);
  } catch (err) {
    console.error("[reports] GET /:id error:", err);
    res.status(500).json({ message: "Failed to fetch report" });
  }
});

// ---------------------------------------------------------------------------
// POST /reports
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  const role = res.locals.role as string;
  const {
    title,
    weekStart,
    weekEnd,
    contentJson,
    status,
    content,
    dateRangeStart,
    dateRangeEnd,
  } = req.body as {
    studentId?: string;
    title: string;
    weekStart: string;
    weekEnd?: string;
    contentJson?: string;
    status?: string;
    content?: string;
    dateRangeStart?: string;
    dateRangeEnd?: string;
  };

  let resolvedStudentId: string;

  if (role === "student") {
    let student;
    try {
      student = await getStudentByUserId(res.locals.userId);
    } catch (err) {
      console.error("[reports] POST / student lookup error:", err);
      res.status(500).json({ message: "Failed to resolve student profile" });
      return;
    }
    if (!student) {
      res.status(409).json({
        error: "no_student_binding",
        message: "Your account is not linked to a student profile.",
      });
      return;
    }
    resolvedStudentId = student.id;
  } else if (role === "instructor") {
    const bodyStudentId = (req.body as { studentId?: string }).studentId;
    if (!bodyStudentId) {
      res.status(400).json({ message: "studentId is required" });
      return;
    }
    resolvedStudentId = bodyStudentId;
  } else {
    res.status(403).json({ error: "forbidden", message: "This action requires instructor access" });
    return;
  }

  if (!title || !weekStart) {
    res.status(400).json({ message: "title and weekStart are required" });
    return;
  }

  try {
    const reportStatus = status ?? "draft";
    const [report] = await db
      .insert(weeklyReportsTable)
      .values({
        studentId: resolvedStudentId,
        title,
        weekStart,
        weekEnd: weekEnd ?? undefined,
        content: content ?? "",
        contentJson: contentJson ?? undefined,
        status: reportStatus,
        dateRangeStart: dateRangeStart ?? weekStart,
        dateRangeEnd: dateRangeEnd ?? weekEnd,
        submittedAt: reportStatus === "submitted" ? new Date() : undefined,
      })
      .returning();
    res.status(201).json(report);
  } catch (err) {
    console.error("[reports] POST / error:", err);
    res.status(500).json({ message: "Failed to create report" });
  }
});

// ---------------------------------------------------------------------------
// POST /reports/:id/generate
//
// Triggers rule-based AI content generation for the given report.
// The report must have dateRangeStart and dateRangeEnd set.
// Returns 202 immediately; generation runs asynchronously.
// Poll GET /reports/:id until generationStatus = "generated" | "failed".
// ---------------------------------------------------------------------------
router.post("/:id/generate", async (req, res) => {
  const role = res.locals.role as string;
  const id = req.params["id"] as string;

  // Fetch the report
  let report: typeof weeklyReportsTable.$inferSelect | undefined;
  try {
    const [r] = await db
      .select()
      .from(weeklyReportsTable)
      .where(eq(weeklyReportsTable.id, id))
      .limit(1);
    report = r;
  } catch (err) {
    console.error("[reports] POST /:id/generate fetch error:", err);
    res.status(500).json({ message: "Failed to fetch report" });
    return;
  }

  if (!report) {
    res.status(404).json({ message: "Report not found" });
    return;
  }

  // Students can only generate their own reports
  if (role === "student") {
    let student;
    try {
      student = await getStudentByUserId(res.locals.userId);
    } catch (err) {
      console.error("[reports] POST /:id/generate student lookup error:", err);
      res.status(500).json({ message: "Failed to resolve student profile" });
      return;
    }
    if (!student || report.studentId !== student.id) {
      res.status(403).json({ error: "forbidden", message: "You can only generate your own reports" });
      return;
    }
  }

  if (!report.dateRangeStart || !report.dateRangeEnd) {
    res.status(400).json({ message: "Report must have dateRangeStart and dateRangeEnd set before generating" });
    return;
  }

  if (report.generationStatus === "generating") {
    res.status(409).json({ message: "Generation already in progress" });
    return;
  }

  // Mark as generating and return 202 immediately
  try {
    await db
      .update(weeklyReportsTable)
      .set({ generationStatus: "generating", updatedAt: new Date() })
      .where(eq(weeklyReportsTable.id, id));
  } catch (err) {
    console.error("[reports] POST /:id/generate set-generating error:", err);
    res.status(500).json({ message: "Failed to start generation" });
    return;
  }

  res.status(202).json({ reportId: id, generationStatus: "generating" });

  // --- Async generation (after response is sent) ---
  // Derive the user_id: for student, use res.locals.userId;
  // for instructor generating on behalf of student, look up student's userId.
  const generatingUserId = res.locals.userId as string;

  setImmediate(async () => {
    try {
      // Find the student's user_id (needed to scope scinotes query)
      const [student] = await db
        .select()
        .from(studentsTable)
        .where(eq(studentsTable.id, report!.studentId))
        .limit(1);

      // Resolve the user_id that owns the scinotes
      const sciNoteUserId = student?.userId ?? generatingUserId;

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
        [sciNoteUserId, report!.dateRangeStart, report!.dateRangeEnd],
      );

      const experiments = expResult.rows;
      const aiContent = buildAiContent(experiments);

      await db
        .update(weeklyReportsTable)
        .set({
          generationStatus: "generated",
          aiContentJson: JSON.stringify(aiContent),
          experimentCount: experiments.length,
          updatedAt: new Date(),
        })
        .where(eq(weeklyReportsTable.id, id));

    } catch (err) {
      console.error("[reports] POST /:id/generate async generation error:", err);
      // Mark as failed so the frontend can show an error state
      try {
        await db
          .update(weeklyReportsTable)
          .set({ generationStatus: "failed", updatedAt: new Date() })
          .where(eq(weeklyReportsTable.id, id));
      } catch (updateErr) {
        console.error("[reports] POST /:id/generate failed-status update error:", updateErr);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// POST /reports/:id/submit
//
// Dedicated submit endpoint. Separated from PATCH so that:
//  - Permission checks are explicit (student-only, own report)
//  - Content validation runs at the point of submission
//  - submittedAt is always written atomically with the status change
//  - The route layer stays thin — all business rules live in report.service.ts
// ---------------------------------------------------------------------------
router.post("/:id/submit", async (req, res) => {
  const role = res.locals.role as string;
  const id = req.params["id"] as string;

  if (role !== "student") {
    res.status(403).json({ error: "forbidden", message: "Only students can submit reports" });
    return;
  }

  let student;
  try {
    student = await getStudentByUserId(res.locals.userId);
  } catch (err) {
    console.error("[reports] POST /:id/submit student lookup error:", err);
    res.status(500).json({ message: "Failed to resolve student profile" });
    return;
  }

  if (!student) {
    res.status(409).json({
      error: "no_student_binding",
      message: "Your account is not linked to a student profile.",
    });
    return;
  }

  const result = await submitReport(id, student.id).catch((err) => {
    console.error("[reports] POST /:id/submit service error:", err);
    return null;
  });

  if (result === null) {
    res.status(500).json({ message: "Failed to submit report" });
    return;
  }

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_found: 404,
      forbidden: 403,
      already_submitted: 409,
      missing_content: 422,
    };
    const httpStatus = statusMap[result.error.code] ?? 400;
    res.status(httpStatus).json({ error: result.error.code, message: result.error.message });
    return;
  }

  res.json(result.report);
});

// ---------------------------------------------------------------------------
// PATCH /reports/:id
// ---------------------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  const role = res.locals.role as string;
  const id = req.params["id"] as string;

  if (role === "student") {
    let student;
    try {
      student = await getStudentByUserId(res.locals.userId);
    } catch (err) {
      console.error("[reports] PATCH /:id student lookup error:", err);
      res.status(500).json({ message: "Failed to resolve student profile" });
      return;
    }
    if (!student) {
      res.status(409).json({ error: "no_student_binding", message: "Your account is not linked to a student profile." });
      return;
    }
    const [existing] = await db
      .select()
      .from(weeklyReportsTable)
      .where(eq(weeklyReportsTable.id, id))
      .limit(1);
    if (!existing) { res.status(404).json({ message: "Report not found" }); return; }
    if (existing.studentId !== student.id) {
      res.status(403).json({ error: "forbidden", message: "You can only edit your own reports" });
      return;
    }
    const { status } = req.body as { status?: string };
    if (status && status !== "draft" && status !== "submitted") {
      res.status(403).json({ error: "forbidden", message: "Students can only save or submit reports" });
      return;
    }
  } else if (role !== "instructor") {
    res.status(403).json({ error: "forbidden", message: "This action requires instructor access" });
    return;
  }

  const {
    title, weekStart, weekEnd, contentJson, status, content,
    dateRangeStart, dateRangeEnd,
  } = req.body as {
    title?: string; weekStart?: string; weekEnd?: string;
    contentJson?: string; status?: string; content?: string;
    dateRangeStart?: string; dateRangeEnd?: string;
  };

  try {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (title         !== undefined) update.title         = title;
    if (weekStart     !== undefined) update.weekStart     = weekStart;
    if (weekEnd       !== undefined) update.weekEnd       = weekEnd;
    if (contentJson   !== undefined) update.contentJson   = contentJson;
    if (content       !== undefined) update.content       = content;
    if (dateRangeStart !== undefined) update.dateRangeStart = dateRangeStart;
    if (dateRangeEnd   !== undefined) update.dateRangeEnd   = dateRangeEnd;
    if (status        !== undefined) {
      update.status = status;
      if (status === "submitted") update.submittedAt = new Date();
      if (status === "reviewed")  update.reviewedAt  = new Date();
    }

    const [report] = await db
      .update(weeklyReportsTable)
      .set(update)
      .where(eq(weeklyReportsTable.id, id))
      .returning();

    if (!report) { res.status(404).json({ message: "Report not found" }); return; }
    res.json(report);
  } catch (err) {
    console.error("[reports] PATCH /:id error:", err);
    res.status(500).json({ message: "Failed to update report" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /reports/:id
// ---------------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const role = res.locals.role as string;
  const id = req.params["id"] as string;

  if (role === "student") {
    let student;
    try {
      student = await getStudentByUserId(res.locals.userId);
    } catch (err) {
      console.error("[reports] DELETE /:id student lookup error:", err);
      res.status(500).json({ message: "Failed to resolve student profile" });
      return;
    }
    if (!student) {
      res.status(409).json({ error: "no_student_binding", message: "Your account is not linked to a student profile." });
      return;
    }
    const [existing] = await db
      .select()
      .from(weeklyReportsTable)
      .where(eq(weeklyReportsTable.id, id))
      .limit(1);
    if (!existing) { res.status(404).json({ message: "Report not found" }); return; }
    if (existing.studentId !== student.id) {
      res.status(403).json({ error: "forbidden", message: "You can only delete your own reports" });
      return;
    }
  } else if (role !== "instructor") {
    res.status(403).json({ error: "forbidden", message: "This action requires instructor access" });
    return;
  }

  try {
    await db.delete(weeklyReportsTable).where(eq(weeklyReportsTable.id, id));
    res.status(204).end();
  } catch (err) {
    console.error("[reports] DELETE /:id error:", err);
    res.status(500).json({ message: "Failed to delete report" });
  }
});

// ---------------------------------------------------------------------------
// GET /reports/:id/comments
// ---------------------------------------------------------------------------
router.get("/:id/comments", async (req, res) => {
  const { id } = req.params;
  try {
    const comments = await db
      .select()
      .from(reportCommentsTable)
      .where(eq(reportCommentsTable.reportId, id))
      .orderBy(reportCommentsTable.createdAt);
    res.json(comments);
  } catch (err) {
    console.error("[reports] GET /:id/comments error:", err);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// ---------------------------------------------------------------------------
// POST /reports/:id/comments
//
// Instructor-only. After inserting the comment, sends a "report_comment"
// message to the report's student so they can navigate directly to the report.
// ---------------------------------------------------------------------------
router.post("/:id/comments", requireInstructor, async (req, res) => {
  const id = req.params["id"] as string;
  const { authorId, authorName, authorRole, content } = req.body as {
    authorId: string;
    authorName: string;
    authorRole: string;
    content: string;
  };

  if (!authorId || !authorName || !content) {
    res.status(400).json({ message: "authorId, authorName, content are required" });
    return;
  }

  try {
    const [comment] = await db
      .insert(reportCommentsTable)
      .values({ reportId: id, authorId, authorName, authorRole: authorRole ?? "instructor", content })
      .returning();
    res.status(201).json(comment);

    // --- Fire-and-forget: notify the student ---
    setImmediate(async () => {
      try {
        // Fetch the report to get studentId and title
        const [report] = await db
          .select()
          .from(weeklyReportsTable)
          .where(eq(weeklyReportsTable.id, id))
          .limit(1);
        if (!report) return;

        // Resolve student's userId (needed for the message recipient)
        const [student] = await db
          .select()
          .from(studentsTable)
          .where(eq(studentsTable.id, report.studentId))
          .limit(1);
        if (!student?.userId) return; // unlinked profile — cannot notify

        const dateRange =
          report.dateRangeStart && report.dateRangeEnd
            ? `${report.dateRangeStart} 至 ${report.dateRangeEnd}`
            : report.weekStart;

        const commentPreview = content.length > 80 ? content.slice(0, 80) + "…" : content;

        await db.insert(messagesTable).values({
          recipientId: student.userId,
          senderName: authorName,
          type: "report_comment",
          status: "unread",
          title: `导师对你的周报《${report.title}》发表了评论`,
          body: commentPreview,
          metadata: {
            reportId: id,
            reportTitle: report.title,
            reportDateRange: dateRange,
            commentPreview,
          },
        });
      } catch (notifyErr) {
        // Non-fatal: log and swallow — the comment was already saved
        console.error("[reports] POST /:id/comments notification error:", notifyErr);
      }
    });
  } catch (err) {
    console.error("[reports] POST /:id/comments error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;
