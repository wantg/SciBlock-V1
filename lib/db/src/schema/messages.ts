import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * messages — 用户收件箱
 *
 * type 枚举:
 *   invitation    — 导师邀请加入团队
 *   comment       — 导师对实验记录的评论
 *   share_request — 其他用户请求分享实验记录
 *
 * status 枚举:
 *   unread   — 未读
 *   read     — 已读
 *   accepted — 已接受（邀请/请求）
 *   rejected — 已拒绝
 *   deleted  — 已删除（软删除，不展示给用户）
 */
export const messagesTable = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  recipientId: text("recipient_id").notNull(),
  senderName: text("sender_name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("unread"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  /** Type-specific fields stored as JSON. See MessageMetadata in types/messages.ts */
  metadata: jsonb("metadata").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
