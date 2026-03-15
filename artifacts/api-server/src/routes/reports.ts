/**
 * 周报路由
 *
 * GET    /reports                — 按角色分流:
 *                                   student  → 从 JWT userId 解析 studentId，返回自己的周报
 *                                   instructor → 接受 ?studentId=xxx 查指定人
 * GET    /reports/team           — 导师查看全团队周报（按周筛选）
 * GET    /reports/:id            — 查看单条周报
 * POST   /reports                — 创建周报（instructor；学生通过 userId→studentId 自动填充）
 * PATCH  /reports/:id            — 更新周报内容 / 状态
 * DELETE /reports/:id            — 删除周报
 * GET    /reports/:id/comments   — 查看评论
 * POST   /reports/:id/comments   — 添加评论
 *
 * 所有路由均受 requireAuth 保护（在 routes/index.ts 统一注册）。
 * 用户身份从 res.locals.userId / role 读取。
 * 写操作（POST、PATCH、DELETE、comments POST）限 instructor 角色。
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { weeklyReportsTable, reportCommentsTable, studentsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireInstructor } from "../middleware/requireAuth";
import { getStudentByUserId } from "../services/student.service";

const router = Router();

// ---------------------------------------------------------------------------
// GET /reports
//
// Role-based student resolution:
//
//   student role:
//     Ignores any ?studentId query param (even if supplied).
//     Looks up the caller's student profile via userId → students.user_id.
//     Returns 409 if the user account has no bound student profile.
//
//   instructor role:
//     Accepts optional ?studentId=xxx to filter to a specific student.
//     Omitting studentId returns all reports across the team.
//
// TRANSITION: The ?studentId param path for instructors is retained while
// student-role user binding is rolled out.  Once all student accounts are
// bound, the param path can be made mandatory.
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const role = res.locals.role as string;

  if (role === "student") {
    // Derive studentId from the authenticated user's binding.
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

  // Instructor path — optional ?studentId filter.
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
// Instructor-side: team view for a given week
// GET /reports/team?weekStart=YYYY-MM-DD
// ---------------------------------------------------------------------------
router.get("/team", requireInstructor, async (req, res) => {
  const { weekStart } = req.query as { weekStart?: string };
  try {
    const students = await db
      .select()
      .from(studentsTable)
      .orderBy(studentsTable.name);

    const reports = weekStart
      ? await db
          .select()
          .from(weeklyReportsTable)
          .where(eq(weeklyReportsTable.weekStart, weekStart))
          .orderBy(desc(weeklyReportsTable.updatedAt))
      : await db
          .select()
          .from(weeklyReportsTable)
          .orderBy(desc(weeklyReportsTable.weekStart));

    res.json({ students, reports });
  } catch (err) {
    console.error("[reports] GET /team error:", err);
    res.status(500).json({ message: "Failed to fetch team reports" });
  }
});

// ---------------------------------------------------------------------------
// Single report
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
// Create report
// POST /reports
//
// instructor: must supply studentId in body
// ---------------------------------------------------------------------------
router.post("/", requireInstructor, async (req, res) => {
  const { studentId, title, weekStart, weekEnd, contentJson, status, content } = req.body as {
    studentId: string;
    title: string;
    weekStart: string;
    weekEnd?: string;
    contentJson?: string;
    status?: string;
    content?: string;
  };
  if (!studentId || !title || !weekStart) {
    res.status(400).json({ message: "studentId, title, weekStart are required" });
    return;
  }
  try {
    const reportStatus = status ?? "draft";
    const [report] = await db
      .insert(weeklyReportsTable)
      .values({
        studentId,
        title,
        weekStart,
        weekEnd: weekEnd ?? undefined,
        content: content ?? "",
        contentJson: contentJson ?? undefined,
        status: reportStatus,
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
// Update report (content / status)
// PATCH /reports/:id
// ---------------------------------------------------------------------------
router.patch("/:id", requireInstructor, async (req, res) => {
  const id = req.params["id"] as string;
  const { title, weekStart, weekEnd, contentJson, status, content } = req.body as {
    title?: string;
    weekStart?: string;
    weekEnd?: string;
    contentJson?: string;
    status?: string;
    content?: string;
  };
  try {
    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (title !== undefined) update.title = title;
    if (weekStart !== undefined) update.weekStart = weekStart;
    if (weekEnd !== undefined) update.weekEnd = weekEnd;
    if (contentJson !== undefined) update.contentJson = contentJson;
    if (content !== undefined) update.content = content;
    if (status !== undefined) {
      update.status = status;
      if (status === "submitted") update.submittedAt = new Date();
      if (status === "reviewed") update.reviewedAt = new Date();
    }

    const [report] = await db
      .update(weeklyReportsTable)
      .set(update)
      .where(eq(weeklyReportsTable.id, id))
      .returning();

    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    res.json(report);
  } catch (err) {
    console.error("[reports] PATCH /:id error:", err);
    res.status(500).json({ message: "Failed to update report" });
  }
});

// ---------------------------------------------------------------------------
// Delete report
// DELETE /reports/:id
// ---------------------------------------------------------------------------
router.delete("/:id", requireInstructor, async (req, res) => {
  const id = req.params["id"] as string;
  try {
    await db.delete(weeklyReportsTable).where(eq(weeklyReportsTable.id, id));
    res.status(204).end();
  } catch (err) {
    console.error("[reports] DELETE /:id error:", err);
    res.status(500).json({ message: "Failed to delete report" });
  }
});

// ---------------------------------------------------------------------------
// Comments
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

// POST /reports/:id/comments
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
      .values({
        reportId: id,
        authorId,
        authorName,
        authorRole: authorRole ?? "instructor",
        content,
      })
      .returning();
    res.status(201).json(comment);
  } catch (err) {
    console.error("[reports] POST /:id/comments error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;
