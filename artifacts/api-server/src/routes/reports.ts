import { Router } from "express";
import { db } from "@workspace/db";
import { weeklyReportsTable, reportCommentsTable, studentsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// ---------------------------------------------------------------------------
// Student-side: list own reports
// GET /reports?studentId=xxx
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const { studentId } = req.query as { studentId?: string };
  if (!studentId) {
    return res.status(400).json({ message: "studentId is required" });
  }
  try {
    const reports = await db
      .select()
      .from(weeklyReportsTable)
      .where(eq(weeklyReportsTable.studentId, studentId))
      .orderBy(desc(weeklyReportsTable.weekStart));
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// ---------------------------------------------------------------------------
// Instructor-side: team view for a given week
// GET /reports/team?weekStart=YYYY-MM-DD
// ---------------------------------------------------------------------------
router.get("/team", async (req, res) => {
  const { weekStart } = req.query as { weekStart?: string };
  try {
    const students = await db
      .select()
      .from(studentsTable)
      .orderBy(studentsTable.name);

    let reports;
    if (weekStart) {
      reports = await db
        .select()
        .from(weeklyReportsTable)
        .where(eq(weeklyReportsTable.weekStart, weekStart))
        .orderBy(desc(weeklyReportsTable.updatedAt));
    } else {
      reports = await db
        .select()
        .from(weeklyReportsTable)
        .orderBy(desc(weeklyReportsTable.weekStart));
    }

    res.json({ students, reports });
  } catch (err) {
    console.error(err);
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
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch report" });
  }
});

// ---------------------------------------------------------------------------
// Create report
// POST /reports
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  const { studentId, title, weekStart, weekEnd, contentJson, status } = req.body as {
    studentId: string;
    title: string;
    weekStart: string;
    weekEnd?: string;
    contentJson?: string;
    status?: string;
  };
  if (!studentId || !title || !weekStart) {
    return res.status(400).json({ message: "studentId, title, weekStart are required" });
  }
  try {
    const reportStatus = status ?? "draft";
    const [report] = await db
      .insert(weeklyReportsTable)
      .values({
        studentId,
        title,
        weekStart,
        weekEnd: weekEnd ?? null,
        contentJson: contentJson ?? null,
        status: reportStatus,
        submittedAt: reportStatus === "submitted" ? new Date() : null,
      })
      .returning();
    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create report" });
  }
});

// ---------------------------------------------------------------------------
// Update report (content / status)
// PATCH /reports/:id
// ---------------------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
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

    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update report" });
  }
});

// ---------------------------------------------------------------------------
// Delete report
// DELETE /reports/:id
// ---------------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(weeklyReportsTable).where(eq(weeklyReportsTable.id, id));
    res.status(204).end();
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// POST /reports/:id/comments
router.post("/:id/comments", async (req, res) => {
  const { id } = req.params;
  const { authorId, authorName, authorRole, content } = req.body as {
    authorId: string;
    authorName: string;
    authorRole: string;
    content: string;
  };
  if (!authorId || !authorName || !content) {
    return res.status(400).json({ message: "authorId, authorName, content are required" });
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
    console.error(err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;
