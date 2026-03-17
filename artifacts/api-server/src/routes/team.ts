/**
 * 团队成员路由
 *
 * GET    /api/team/members          — 获取所有成员
 * POST   /api/team/members          — 邀请新成员
 * GET    /api/team/members/:id      — 获取成员详情
 * PATCH  /api/team/members/:id      — 更新成员信息
 *
 * GET    /api/team/members/:id/papers   — 获取成员论文列表
 * POST   /api/team/members/:id/papers   — 添加论文记录
 *
 * GET    /api/team/members/:id/reports  — 获取周报列表
 * POST   /api/team/members/:id/reports  — 提交周报
 *
 * Initial data is populated by bash scripts/seed-dev.sh — not by HTTP routes.
 */

import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { studentsTable, papersTable, weeklyReportsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireInstructor } from "../middleware/requireAuth";
import { findStudentById } from "../repositories/student.repository";

// ---------------------------------------------------------------------------
// Ownership helper
// Allows instructors unconditionally; allows students only when their auth
// userId matches the students.userId column for the requested profile.
// Returns true if access is granted; returns false and writes the 403 response
// if access is denied (caller must return immediately after false).
// ---------------------------------------------------------------------------
async function assertOwnerOrInstructor(
  res: Response,
  studentProfileId: string,
): Promise<boolean> {
  if (res.locals.role === "instructor") return true;
  const profile = await findStudentById(studentProfileId);
  if (!profile || profile.userId == null || profile.userId !== res.locals.userId) {
    res.status(403).json({
      error: "forbidden",
      message: "只能修改自己的信息",
    });
    return false;
  }
  return true;
}

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

router.get("/members", async (_req, res) => {
  try {
    const members = await db.select().from(studentsTable).orderBy(studentsTable.createdAt);
    res.json({ members: members.reverse() });
  } catch (err) {
    console.error("[team] GET members error:", err);
    res.status(500).json({ error: "server_error", message: "获取成员列表失败" });
  }
});

router.post("/members", requireInstructor, async (req, res) => {
  const { name, email, phone, enrollmentYear, degree, researchTopic } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    enrollmentYear?: number;
    degree?: string;
    researchTopic?: string;
  };

  if (!name || !enrollmentYear || !degree || !researchTopic) {
    res.status(400).json({ error: "bad_request", message: "必填字段缺失" });
    return;
  }

  try {
    const [student] = await db
      .insert(studentsTable)
      .values({ name, email: email ?? null, phone: phone ?? null, enrollmentYear, degree, researchTopic, status: "pending" })
      .returning();
    res.status(201).json({ student });
  } catch (err) {
    console.error("[team] POST members error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/members/:id", async (req, res) => {
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, req.params.id));
    if (!student) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ student });
  } catch (err) {
    console.error("[team] GET member error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.patch("/members/:id", async (req, res) => {
  const memberId = req.params["id"] as string;
  if (!await assertOwnerOrInstructor(res, memberId)) return;

  const { name, phone, email, enrollmentYear, degree, researchTopic, status } = req.body as {
    name?: string; phone?: string; email?: string;
    enrollmentYear?: number; degree?: string; researchTopic?: string;
    status?: string;
  };

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (phone !== undefined) patch.phone = phone;
  if (email !== undefined) patch.email = email;
  if (enrollmentYear !== undefined) patch.enrollmentYear = enrollmentYear;
  if (degree !== undefined) patch.degree = degree;
  if (researchTopic !== undefined) patch.researchTopic = researchTopic;
  if (status !== undefined) patch.status = status;

  try {
    const [updated] = await db
      .update(studentsTable)
      .set(patch)
      .where(eq(studentsTable.id, memberId))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ student: updated });
  } catch (err) {
    console.error("[team] PATCH member error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// Papers
// ---------------------------------------------------------------------------

router.get("/members/:id/papers", async (req, res) => {
  try {
    const papers = await db.select().from(papersTable).where(eq(papersTable.studentId, req.params.id));
    res.json({ papers: papers.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)) });
  } catch (err) {
    console.error("[team] GET papers error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/members/:id/papers", async (req, res) => {
  if (!await assertOwnerOrInstructor(res, req.params["id"] as string)) return;
  const { title, journal, year, abstract, doi, fileName, isThesis } = req.body as {
    title?: string; journal?: string; year?: number; abstract?: string;
    doi?: string; fileName?: string; isThesis?: boolean;
  };

  if (!title) { res.status(400).json({ error: "bad_request", message: "论文标题必填" }); return; }

  const studentId = req.params["id"] as string;
  try {
    const [paper] = await db
      .insert(papersTable)
      .values({ studentId, title, journal: journal ?? null, year: year ?? null, abstract: abstract ?? null, doi: doi ?? null, fileName: fileName ?? null, isThesis: isThesis ?? false })
      .returning();
    res.status(201).json({ paper });
  } catch (err) {
    console.error("[team] POST papers error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/members/:id/papers/:paperId", async (req, res) => {
  if (!await assertOwnerOrInstructor(res, req.params["id"] as string)) return;
  const paperId = req.params["paperId"] as string;
  try {
    await db.delete(papersTable).where(eq(papersTable.id, paperId));
    res.json({ success: true });
  } catch (err) {
    console.error("[team] DELETE paper error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// Weekly Reports
// ---------------------------------------------------------------------------

router.get("/members/:id/reports", async (req, res) => {
  try {
    const reports = await db.select().from(weeklyReportsTable).where(eq(weeklyReportsTable.studentId, req.params.id));
    res.json({ reports: reports.sort((a, b) => b.weekStart.localeCompare(a.weekStart)) });
  } catch (err) {
    console.error("[team] GET reports error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/members/:id/reports", async (req, res) => {
  if (!await assertOwnerOrInstructor(res, req.params["id"] as string)) return;
  const { title, content, weekStart } = req.body as {
    title?: string; content?: string; weekStart?: string;
  };

  if (!title || !weekStart) { res.status(400).json({ error: "bad_request", message: "标题和周次必填" }); return; }

  const studentId = req.params["id"] as string;
  try {
    const [report] = await db
      .insert(weeklyReportsTable)
      .values({ studentId, title, content: content ?? "", weekStart })
      .returning();
    res.status(201).json({ report });
  } catch (err) {
    console.error("[team] POST reports error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
