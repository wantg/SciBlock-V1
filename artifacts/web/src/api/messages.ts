/**
 * messages — 前端数据访问层
 *
 * Layer: api (thin fetch wrapper)
 *
 * 所有消息相关的 HTTP 调用都经过此模块，组件层不直接调用 fetch。
 * 用户身份通过 apiFetch 统一注入的 Authorization: Bearer <token> header 传递。
 * X-User-Id 已移除 — 服务端从 JWT claims 读取用户 ID。
 */

import { apiFetch } from "./client";
import type { MessagesListResponse, MessageActionRequest, Message } from "../types/messages";

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchMessages(): Promise<MessagesListResponse> {
  return apiFetch<MessagesListResponse>("/messages");
}

export function markMessageRead(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/messages/${id}/read`, {
    method: "PATCH",
  });
}

export function performMessageAction(
  id: string,
  action: MessageActionRequest["action"],
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/messages/${id}/action`, {
    method: "PATCH",
    body: JSON.stringify({ action } satisfies MessageActionRequest),
  });
}

export function deleteMessage(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/messages/${id}`, {
    method: "DELETE",
  });
}

/** Helper to extract typed metadata from a message */
export function getTypedMetadata<T extends Record<string, string>>(
  message: Message,
): T {
  return (message.metadata ?? {}) as T;
}
