/**
 * 周报路由
 *
 * GET    /reports                     — 按角色分流（student 自己 / instructor 可筛选）
 * GET    /reports/team                — 导师查看全团队周报（按周筛选）
 * GET    /reports/preview             — 预览某时间段内命中的实验（学生自用）
 * GET    /reports/:id                 — 查看单条周报
 * GET    /reports/:id/links           — 查看周报关联实验记录（学生+导师）
 * POST   /reports                     — 创建周报
 * POST   /reports/:id/generate        — 触发汇总生成（规则化，异步写入 ai_content_json）
 * POST   /reports/:id/submit          — 提交周报
 * PUT    /reports/:id/links           — 全量替换关联实验记录（draft/needs_revision 状态有效）
 * PATCH  /reports/:id                 — 更新周报内容 / 状态
 * DELETE /reports/:id                 — 删除周报
 * GET    /reports/:id/comments        — 查看评论
 * POST   /reports/:id/review          — 导师批阅周报（状态更新 + 消息通知学生）
 * POST   /reports/:id/comments        — 添加评论（导师专属；写入后发消息通知学生）
 *
 * 所有路由均受 requireAuth 保护（在 routes/index.ts 统一注册）。
 * 用户身份从 res.locals.userId / role 读取。
 *
 * 职责边界：
 *   - 本文件只处理 HTTP 层（请求解析、权限检查、响应格式化）。
 *   - 业务逻辑和 AI 生成流程委托给服务层（report.service / report-generation.service）。
 *   - 数据查询复杂逻辑委托给 report.repository。
 */

import { Response, Router } from "express";
import { db, pool } from "@workspace/db";
import {
  weeklyReportsTable,
  reportCommentsTable,
  reportExperimentLinksTable,
  studentsTable,
  messagesTable,
} from "@workspace/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { requireInstructor } from "../middleware/requireAuth";
import { getStudentByUserId } from "../services/student.service";
import { hasShareAccess } from "../repositories/share.repository";
import { submitReport, reviewReport } from "../services/report.service";
import { runReportGeneration } from "../services/report-generation.service";
import {
  findSubmittedReportsForTeam,
  findLastSubmissionPerStudent,
  findStudentUserIdByReport,
} from "../repositories/report.repository";

const router = Router();

// ---------------------------------------------------------------------------
// Local helper — resolveStudentOrRespond
//
// Looks up the student profile for the given userId. If the lookup fails or
// the profile doesn't exist, writes the appropriate error response and returns
// null so the caller can `return` immediately.
//
// Usage pattern (eliminates the repeated try/catch block):
//
//   const student = await resolveStudentOrRespond(res.locals.userId, res, "POST /");
//   if (!student) return;
// ---------------------------------------------------------------------------

async function resolveStudentOrRespond(
  userId: string,
  res: Response,
  logLabel: string,
): Promise<typeof studentsTable.$inferSelect | null> {
  try {
    const student = await getStudentByUserId(userId);
    if (!student) {
      res.status(409).json({
        error: "no_student_binding",
        message: "Your account is not linked to a student profile.",
      });
      return null;
    }
    return student;
  } catch (err) {
    console.error(`[reports] ${logLabel} student lookup error:`, err);
    res.status(500).json({ message: "Failed to resolve student profile" });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Inline type for experiment preview rows (used only in GET /preview)
// ---------------------------------------------------------------------------

interface ExperimentPreviewRow {
  id: string;
  sci_note_id: string;
  sci_note_title: string;
  title: string;
  experiment_status: string;
  purpose_input: string | null;
  current_modules: string | null;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// GET /reports
// ---------------------------------------------------------------------------

router.get("/", async (req, res) => {
  const role = res.locals.role as string;

  if (role === "student") {
    const student = await resolveStudentOrRespond(res.locals.userId, res, "GET /");
    if (!student) return;

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

  // Instructor: optional ?studentId= filter
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
    const [students, reports, lastSubmissions] = await Promise.all([
      db.select().from(studentsTable).orderBy(studentsTable.name),
      findSubmittedReportsForTeam(weekStart),
      findLastSubmissionPerStudent(),
    ]);
    res.json({ students, reports, lastSubmissions });
  } catch (err) {
    console.error("[reports] GET /team error:", err);
    res.status(500).json({ message: "Failed to fetch team reports" });
  }
});

// ---------------------------------------------------------------------------
// GET /reports/preview?dateStart=YYYY-MM-DD&dateEnd=YYYY-MM-DD
//
// Returns experiments that would be included in an AI-generated report for
// the given date range. Student role only (instructors pass ?studentUserId=).
// ---------------------------------------------------------------------------

router.get("/preview", async (req, res) => {
  const role = res.locals.role as string;

  let userId: string;
  if (role === "student") {
    userId = res.locals.userId;
  } else {
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
    const result = await pool.query<ExperimentPreviewRow>(
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

    const sciNoteMap = new Map<string, { title: string; count: number }>();
    for (const e of experiments) {
      const entry = sciNoteMap.get(e.sci_note_id);
      if (entry) entry.count++;
      else sciNoteMap.set(e.sci_note_id, { title: e.sci_note_title, count: 1 });
    }

    res.json({
      experimentCount: experiments.length,
      sciNoteCount:    sciNoteMap.size,
      experiments: experiments.map((e) => ({
        id:           e.id,
        title:        e.title,
        sciNoteId:    e.sci_note_id,
        sciNoteTitle: e.sci_note_title,
        status:       e.experiment_status,
        createdAt:    e.created_at,
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
  const callerId = res.locals.userId as string;
  const callerRole = res.locals.role as string;

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

    // Access control:
    //   - Instructors can see all reports.
    //   - The report's own student can see their report (checked via student binding).
    //   - Any user with a valid share record for this report can see it.
    if (callerRole !== "instructor") {
      const student = await getStudentByUserId(callerId);
      const isOwner = student && student.id === report.studentId;

      if (!isOwner) {
        const isSharedWithCaller = await hasShareAccess("weekly_report", id, callerId);
        if (!isSharedWithCaller) {
          res.status(403).json({ error: "forbidden", message: "无权限查看此报告。" });
          return;
        }
      }
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
    const student = await resolveStudentOrRespond(res.locals.userId, res, "POST /");
    if (!student) return;
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
        studentId:     resolvedStudentId,
        title,
        weekStart,
        weekEnd:       weekEnd ?? undefined,
        content:       content ?? "",
        contentJson:   contentJson ?? undefined,
        status:        reportStatus,
        dateRangeStart: dateRangeStart ?? weekStart,
        dateRangeEnd:   dateRangeEnd ?? weekEnd,
        submittedAt:   reportStatus === "submitted" ? new Date() : undefined,
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
// Returns 202 immediately; actual generation runs asynchronously via
// runReportGeneration() from report-generation.service.
// Poll GET /reports/:id until generationStatus = "generated" | "failed".
// ---------------------------------------------------------------------------

router.post("/:id/generate", async (req, res) => {
  const role = res.locals.role as string;
  const id   = req.params["id"] as string;

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
    const student = await resolveStudentOrRespond(res.locals.userId, res, "POST /:id/generate");
    if (!student) return;
    if (report.studentId !== student.id) {
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

  // Mark as generating synchronously, then return 202
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

  // Resolve the user_id that owns the scinotes (may differ from instructor who triggered this)
  const generatingUserId = res.locals.userId as string;

  setImmediate(async () => {
    // Fetch the student owner to scope the scinotes query
    const [owner] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, report!.studentId))
      .limit(1);

    const sciNoteUserId = owner?.userId ?? generatingUserId;

    await runReportGeneration(
      id,
      sciNoteUserId,
      report!.dateRangeStart!,
      report!.dateRangeEnd!,
      report!.linksLastSavedAt ?? null,
    );
  });
});

// ---------------------------------------------------------------------------
// POST /reports/:id/submit
//
// Dedicated submit endpoint. Separated from PATCH so that:
//   - Permission checks are explicit (student-only, own report)
//   - submittedAt is always written atomically with the status change
//   - All business rules live in report.service.ts
// ---------------------------------------------------------------------------

router.post("/:id/submit", async (req, res) => {
  const role = res.locals.role as string;
  const id   = req.params["id"] as string;

  if (role !== "student") {
    res.status(403).json({ error: "forbidden", message: "Only students can submit reports" });
    return;
  }

  const student = await resolveStudentOrRespond(res.locals.userId, res, "POST /:id/submit");
  if (!student) return;

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
      not_found:        404,
      forbidden:        403,
      already_submitted: 409,
      missing_content:  422,
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
  const id   = req.params["id"] as string;

  if (role === "student") {
    const student = await resolveStudentOrRespond(res.locals.userId, res, "PATCH /:id");
    if (!student) return;

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
    if (title          !== undefined) update.title          = title;
    if (weekStart      !== undefined) update.weekStart      = weekStart;
    if (weekEnd        !== undefined) update.weekEnd        = weekEnd;
    if (contentJson    !== undefined) update.contentJson    = contentJson;
    if (content        !== undefined) update.content        = content;
    if (dateRangeStart !== undefined) update.dateRangeStart = dateRangeStart;
    if (dateRangeEnd   !== undefined) update.dateRangeEnd   = dateRangeEnd;
    if (status         !== undefined) {
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
  const id   = req.params["id"] as string;

  if (role === "student") {
    const student = await resolveStudentOrRespond(res.locals.userId, res, "DELETE /:id");
    if (!student) return;

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
// GET /reports/:id/links
//
// Returns the explicitly linked experiment records for this report.
// Each item includes full experiment details (id, title, status, sciNote info).
// Accessible by: report owner (student) OR instructor.
// ---------------------------------------------------------------------------

interface LinkedExperimentRow {
  id: string;
  sci_note_id: string;
  sci_note_title: string;
  title: string;
  experiment_status: string;
  purpose_input: string | null;
  created_at: Date;
}

router.get("/:id/links", async (req, res) => {
  const role = res.locals.role as string;
  const id   = req.params["id"] as string;

  // Fetch the report
  const [report] = await db
    .select()
    .from(weeklyReportsTable)
    .where(eq(weeklyReportsTable.id, id))
    .limit(1);

  if (!report) {
    res.status(404).json({ message: "Report not found" });
    return;
  }

  // Access control: student can only see their own; instructor can see all
  if (role === "student") {
    const student = await resolveStudentOrRespond(res.locals.userId, res, "GET /:id/links");
    if (!student) return;
    if (report.studentId !== student.id) {
      res.status(403).json({ error: "forbidden", message: "Access denied" });
      return;
    }
  }

  try {
    // Get link rows
    const links = await db
      .select()
      .from(reportExperimentLinksTable)
      .where(eq(reportExperimentLinksTable.reportId, id));

    if (links.length === 0) {
      res.json({ experimentRecordIds: [], experiments: [] });
      return;
    }

    const recordIds = links.map((l) => l.experimentRecordId);

    // Fetch full experiment details from Go API's tables (same DB)
    const placeholders = recordIds.map((_, i) => `$${i + 1}`).join(", ");
    const expResult = await pool.query<LinkedExperimentRow>(
      `SELECT
         e.id,
         e.sci_note_id,
         s.title AS sci_note_title,
         e.title,
         e.experiment_status,
         e.purpose_input,
         e.created_at
       FROM experiment_records e
       JOIN scinotes s ON s.id = e.sci_note_id
       WHERE e.id IN (${placeholders})
         AND e.is_deleted = false
       ORDER BY e.created_at DESC`,
      recordIds,
    );

    res.json({
      experimentRecordIds: recordIds,
      experiments: expResult.rows.map((e) => ({
        id: e.id,
        sciNoteId: e.sci_note_id,
        sciNoteTitle: e.sci_note_title,
        title: e.title,
        status: e.experiment_status,
        purposeInput: e.purpose_input,
        createdAt: (e.created_at instanceof Date ? e.created_at : new Date(e.created_at)).toISOString(),
      })),
    });
  } catch (err) {
    console.error("[reports] GET /:id/links error:", err);
    res.status(500).json({ message: "Failed to fetch linked experiments" });
  }
});

// ---------------------------------------------------------------------------
// PUT /reports/:id/links
//
// Replaces the full set of linked experiment records for this report.
// Body: { experimentRecordIds: string[] }
//
// Access: student (own report, draft or needs_revision only).
// Validates:
//   - report exists and belongs to the student
//   - report is in an editable state (draft | needs_revision)
//   - all record IDs exist in experiment_records, belong to the same student,
//     and are not soft-deleted
// ---------------------------------------------------------------------------

router.put("/:id/links", async (req, res) => {
  const role = res.locals.role as string;
  const id   = req.params["id"] as string;

  if (role !== "student") {
    res.status(403).json({ error: "forbidden", message: "Only students can update report links" });
    return;
  }

  const student = await resolveStudentOrRespond(res.locals.userId, res, "PUT /:id/links");
  if (!student) return;

  // Fetch the report
  const [report] = await db
    .select()
    .from(weeklyReportsTable)
    .where(eq(weeklyReportsTable.id, id))
    .limit(1);

  if (!report) {
    res.status(404).json({ message: "Report not found" });
    return;
  }

  if (report.studentId !== student.id) {
    res.status(403).json({ error: "forbidden", message: "You can only update links for your own reports" });
    return;
  }

  const editableStatuses = ["draft", "needs_revision"];
  if (!editableStatuses.includes(report.status)) {
    res.status(422).json({
      error: "not_editable",
      message: "Links can only be updated while the report is in draft or needs_revision status",
    });
    return;
  }

  const { experimentRecordIds } = req.body as { experimentRecordIds: unknown };

  if (!Array.isArray(experimentRecordIds)) {
    res.status(400).json({ message: "experimentRecordIds must be an array" });
    return;
  }
  if (experimentRecordIds.some((id) => typeof id !== "string")) {
    res.status(400).json({ message: "All experimentRecordIds must be strings" });
    return;
  }

  const ids = experimentRecordIds as string[];

  // Validate that all record IDs exist and belong to this student's scinotes
  if (ids.length > 0) {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const validResult = await pool.query<{ id: string }>(
      `SELECT e.id
       FROM experiment_records e
       JOIN scinotes s ON s.id = e.sci_note_id
       WHERE e.id IN (${placeholders})
         AND s.user_id = $${ids.length + 1}
         AND e.is_deleted = false`,
      [...ids, student.userId],
    );

    const validIds = new Set(validResult.rows.map((r) => r.id));
    const invalid = ids.filter((rid) => !validIds.has(rid));
    if (invalid.length > 0) {
      res.status(422).json({
        error: "invalid_records",
        message: `Some experiment record IDs are invalid or not accessible: ${invalid.join(", ")}`,
      });
      return;
    }
  }

  try {
    // Full replace: delete existing, insert new (in a transaction)
    // Also stamp links_last_saved_at so generation knows the student
    // has explicitly managed links (even if they saved an empty set).
    await db.transaction(async (tx) => {
      await tx
        .delete(reportExperimentLinksTable)
        .where(eq(reportExperimentLinksTable.reportId, id));

      if (ids.length > 0) {
        await tx.insert(reportExperimentLinksTable).values(
          ids.map((rid) => ({ reportId: id, experimentRecordId: rid })),
        );
      }

      await tx
        .update(weeklyReportsTable)
        .set({ linksLastSavedAt: new Date(), updatedAt: new Date() })
        .where(eq(weeklyReportsTable.id, id));
    });

    res.json({ reportId: id, experimentRecordIds: ids, count: ids.length });
  } catch (err) {
    console.error("[reports] PUT /:id/links error:", err);
    res.status(500).json({ message: "Failed to update report links" });
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
// POST /reports/:id/review
//
// Instructor-only. Records the instructor's review decision (approve or
// request_revision) for a weekly report. The service layer enforces the
// valid state transitions. After responding, a fire-and-forget notification
// is sent to the student so they are informed of the review outcome.
//
// Body:
//   action       "approve" | "request_revision"
//   reviewerName string  (instructor's display name, for the notification)
//   feedbackText string? (optional; inserted as a comment if present)
// ---------------------------------------------------------------------------

router.post("/:id/review", requireInstructor, async (req, res) => {
  const reportId = req.params["id"] as string;
  const { action, reviewerName, feedbackText } = req.body as {
    action: string;
    reviewerName: string;
    feedbackText?: string;
  };

  if (!action || !reviewerName) {
    res.status(400).json({ message: "action and reviewerName are required" });
    return;
  }
  if (action !== "approve" && action !== "request_revision") {
    res.status(400).json({ message: "action must be 'approve' or 'request_revision'" });
    return;
  }

  try {
    const result = await reviewReport(reportId, action as "approve" | "request_revision");

    if (!result.ok) {
      const status = result.error.code === "not_found" ? 404 : 422;
      res.status(status).json({ message: result.error.message });
      return;
    }

    // Optionally insert instructor comment when feedback text is provided
    if (feedbackText?.trim()) {
      const instructorId = res.locals["userId"] as string;
      await db.insert(reportCommentsTable).values({
        reportId,
        authorId:   instructorId,
        authorName: reviewerName,
        authorRole: "instructor",
        content:    feedbackText.trim(),
      });
    }

    res.json(result.report);

    // Fire-and-forget: notify the student of the review outcome (non-fatal)
    setImmediate(async () => {
      try {
        const studentUserId = await findStudentUserIdByReport(reportId);
        if (!studentUserId) return;

        const report = result.report;
        const isApproved = action === "approve";
        const dateRange =
          report.dateRangeStart && report.dateRangeEnd
            ? `${report.dateRangeStart} 至 ${report.dateRangeEnd}`
            : report.weekStart;

        await db.insert(messagesTable).values({
          recipientId: studentUserId,
          senderName:  reviewerName,
          type:        isApproved ? "report_reviewed" : "report_needs_revision",
          status:      "unread",
          title: isApproved
            ? `导师已批阅你的周报《${report.title}》`
            : `导师要求修改你的周报《${report.title}》`,
          body: feedbackText?.trim()
            ? (feedbackText.length > 80 ? feedbackText.slice(0, 80) + "…" : feedbackText)
            : isApproved
              ? "你的周报已通过批阅，请继续保持。"
              : "请根据导师意见修改后重新提交。",
          metadata: {
            reportId,
            reportTitle:     report.title,
            reportDateRange: dateRange,
            action,
          },
        });
      } catch (notifyErr) {
        console.error("[reports] POST /:id/review notification error:", notifyErr);
      }
    });
  } catch (err) {
    console.error("[reports] POST /:id/review error:", err);
    res.status(500).json({ message: "Failed to review report" });
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

    // Fire-and-forget: notify the student (non-fatal if this fails)
    setImmediate(async () => {
      try {
        const [report] = await db
          .select()
          .from(weeklyReportsTable)
          .where(eq(weeklyReportsTable.id, id))
          .limit(1);
        if (!report) return;

        const [student] = await db
          .select()
          .from(studentsTable)
          .where(eq(studentsTable.id, report.studentId))
          .limit(1);
        if (!student?.userId) return;

        const dateRange =
          report.dateRangeStart && report.dateRangeEnd
            ? `${report.dateRangeStart} 至 ${report.dateRangeEnd}`
            : report.weekStart;

        const commentPreview = content.length > 80 ? content.slice(0, 80) + "…" : content;

        await db.insert(messagesTable).values({
          recipientId: student.userId,
          senderName:  authorName,
          type:        "report_comment",
          status:      "unread",
          title:       `导师对你的周报《${report.title}》发表了评论`,
          body:        commentPreview,
          metadata: {
            reportId:         id,
            reportTitle:      report.title,
            reportDateRange:  dateRange,
            commentPreview,
          },
        });
      } catch (notifyErr) {
        console.error("[reports] POST /:id/comments notification error:", notifyErr);
      }
    });
  } catch (err) {
    console.error("[reports] POST /:id/comments error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;
