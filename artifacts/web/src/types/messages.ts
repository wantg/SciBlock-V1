/**
 * messages — 前端类型定义
 *
 * Layer: types (pure data contracts, no side effects)
 */

// ---------------------------------------------------------------------------
// Core enum values
// ---------------------------------------------------------------------------

export type MessageType = "invitation" | "comment" | "share_request";

export type MessageStatus =
  | "unread"
  | "read"
  | "accepted"
  | "rejected"
  | "deleted";

// ---------------------------------------------------------------------------
// Per-type metadata (stored as JSON in DB, typed here for consumers)
// ---------------------------------------------------------------------------

export interface InvitationMeta {
  teamName: string;
  teamId: string;
}

export interface CommentMeta {
  experimentTitle: string;
  experimentId: string;
  comment: string;
}

export interface ShareRequestMeta {
  experimentTitle: string;
  experimentId: string;
}

export type MessageMetadata = InvitationMeta | CommentMeta | ShareRequestMeta;

// ---------------------------------------------------------------------------
// Message entity
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  recipientId: string;
  senderName: string;
  type: MessageType;
  status: MessageStatus;
  title: string;
  body: string;
  metadata: Record<string, string>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

export interface MessagesListResponse {
  messages: Message[];
}

export interface MessageActionRequest {
  action: "accepted" | "rejected";
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/** Human-readable label for each message type */
export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  invitation:    "团队邀请",
  comment:       "实验评论",
  share_request: "分享请求",
};

/** Color token per message type  (Tailwind bg + text) */
export const MESSAGE_TYPE_COLORS: Record<
  MessageType,
  { bg: string; text: string; dot: string }
> = {
  invitation:    { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400"   },
  comment:       { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400"  },
  share_request: { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-400"  },
};
