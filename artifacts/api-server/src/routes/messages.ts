/**
 * 消息路由
 *
 * GET    /api/messages           — 获取当前用户的所有非删除消息（首次访问自动 seed）
 * PATCH  /api/messages/:id/read  — 标记为已读
 * PATCH  /api/messages/:id/action— 接受或拒绝（邀请/分享请求）
 * DELETE /api/messages/:id       — 软删除
 *
 * 所有路由均受 requireAuth 中间件保护（在 routes/index.ts 中统一注册）。
 * 用户身份从 res.locals.userId 读取，不再依赖 X-User-Id header。
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { messagesTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Seed data helper
// ---------------------------------------------------------------------------

function buildSeedMessages(recipientId: string): typeof messagesTable.$inferInsert[] {
  return [
    {
      recipientId,
      senderName: "Prof. Chen Wei",
      type: "invitation",
      status: "unread",
      title: "邀请你加入「纳米材料合成」研究团队",
      body: "导师 Prof. Chen Wei 邀请你加入实验团队「纳米材料合成」。加入后你将可以访问团队共享的实验记录与数据资源。",
      metadata: { teamName: "纳米材料合成", teamId: "team-nano-001" },
    },
    {
      recipientId,
      senderName: "Dr. Liu Yang",
      type: "comment",
      status: "unread",
      title: "Dr. Liu Yang 评论了你的实验记录",
      body: "导师 Dr. Liu Yang 对你的实验记录「Material characterization report」进行了评论：「样品制备步骤中的烧结温度建议提高至 800°C，同时延长保温时间至 2 小时，以确保晶相完全转变。请在下次实验中验证此参数。」",
      metadata: {
        experimentTitle: "Material characterization report",
        experimentId: "exp-001",
        comment: "样品制备步骤中的烧结温度建议提高至 800°C，同时延长保温时间至 2 小时，以确保晶相完全转变。请在下次实验中验证此参数。",
      },
    },
    {
      recipientId,
      senderName: "Li Wei",
      type: "share_request",
      status: "unread",
      title: "Li Wei 请求你分享实验记录",
      body: "用户 Li Wei 请求你分享实验记录「Synthesis protocol v2」。接受后，对方将获得该记录的只读访问权限。",
      metadata: { experimentTitle: "Synthesis protocol v2", experimentId: "exp-002" },
    },
    {
      recipientId,
      senderName: "Prof. Chen Wei",
      type: "invitation",
      status: "read",
      title: "邀请你加入「电化学储能」研究团队",
      body: "导师 Prof. Chen Wei 邀请你加入实验团队「电化学储能」，与团队共同推进新型电极材料的研发工作。",
      metadata: { teamName: "电化学储能", teamId: "team-echem-002" },
    },
    {
      recipientId,
      senderName: "Dr. Wang Fang",
      type: "comment",
      status: "read",
      title: "Dr. Wang Fang 评论了你的实验记录",
      body: "导师 Dr. Wang Fang 对你的实验记录「Test batch 2024」进行了评论：「XRD 图谱分析结果良好，特征峰位置与理论值吻合，结晶度达到预期。建议补充 SEM 形貌表征以完善数据。」",
      metadata: {
        experimentTitle: "Test batch 2024",
        experimentId: "exp-003",
        comment: "XRD 图谱分析结果良好，特征峰位置与理论值吻合，结晶度达到预期。建议补充 SEM 形貌表征以完善数据。",
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET /api/messages — list non-deleted messages; auto-seed on first visit */
router.get("/", async (req, res) => {
  const userId = res.locals.userId;

  try {
    const existing = await db
      .select()
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.recipientId, userId),
          ne(messagesTable.status, "deleted"),
        ),
      )
      .orderBy(messagesTable.createdAt);

    // Auto-seed demo messages on first visit.
    // TRANSITION: seed logic should be replaced by a dedicated admin seeding
    // mechanism or removed once real message sending is implemented.
    if (existing.length === 0) {
      const seeds = buildSeedMessages(userId);
      await db.insert(messagesTable).values(seeds);
      const seeded = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.recipientId, userId),
            ne(messagesTable.status, "deleted"),
          ),
        )
        .orderBy(messagesTable.createdAt);
      res.json({ messages: seeded });
      return;
    }

    res.json({ messages: existing.slice().reverse() });
  } catch (err) {
    console.error("[messages] GET error:", err);
    res.status(500).json({ error: "server_error", message: "获取消息失败" });
  }
});

/** PATCH /api/messages/:id/read */
router.patch("/:id/read", async (req, res) => {
  const userId = res.locals.userId;
  const { id } = req.params;

  try {
    await db
      .update(messagesTable)
      .set({ status: "read" })
      .where(
        and(
          eq(messagesTable.id, id),
          eq(messagesTable.recipientId, userId),
          eq(messagesTable.status, "unread"),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    console.error("[messages] PATCH read error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

/** PATCH /api/messages/:id/action — accept or reject */
router.patch("/:id/action", async (req, res) => {
  const userId = res.locals.userId;
  const { id } = req.params;
  const { action } = req.body as { action?: string };

  if (action !== "accepted" && action !== "rejected") {
    res.status(400).json({ error: "bad_request", message: "action must be accepted or rejected" });
    return;
  }

  try {
    await db
      .update(messagesTable)
      .set({ status: action })
      .where(
        and(
          eq(messagesTable.id, id),
          eq(messagesTable.recipientId, userId),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    console.error("[messages] PATCH action error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

/** DELETE /api/messages/:id — soft delete */
router.delete("/:id", async (req, res) => {
  const userId = res.locals.userId;
  const { id } = req.params;

  try {
    await db
      .update(messagesTable)
      .set({ status: "deleted" })
      .where(
        and(
          eq(messagesTable.id, id),
          eq(messagesTable.recipientId, userId),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    console.error("[messages] DELETE error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
