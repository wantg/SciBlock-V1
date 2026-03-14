/**
 * messages — 前端数据访问层
 *
 * Layer: api (thin fetch wrapper)
 *
 * 所有消息相关的 HTTP 调用都经过此模块，组件层不直接调用 fetch。
 * userId 从 localStorage 读取（登录时写入，见 UserContext）。
 */

import { apiFetch } from "./client";
import type { MessagesListResponse, MessageActionRequest, Message } from "../types/messages";

const STORAGE_KEY = "sciblock:currentUser";

/** 读取当前用户 ID（登录后由 UserContext 写入 localStorage） */
export function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id: string };
    return parsed.id ?? null;
  } catch {
    return null;
  }
}

function authHeaders(): HeadersInit {
  const id = getCurrentUserId();
  return id ? { "X-User-Id": id } : {};
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchMessages(): Promise<MessagesListResponse> {
  return apiFetch<MessagesListResponse>("/messages", {
    headers: authHeaders(),
  });
}

export function markMessageRead(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/messages/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(),
  });
}

export function performMessageAction(
  id: string,
  action: MessageActionRequest["action"],
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/messages/${id}/action`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action } satisfies MessageActionRequest),
  });
}

export function deleteMessage(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/messages/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

/** Helper to extract typed metadata from a message */
export function getTypedMetadata<T extends Record<string, string>>(
  message: Message,
): T {
  return (message.metadata ?? {}) as T;
}
