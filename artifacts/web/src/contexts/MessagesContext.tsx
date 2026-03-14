/**
 * MessagesContext — 消息列表全局状态
 *
 * Layer: context (singleton, wraps AuthenticatedLayout)
 *
 * 职责:
 *   - 首次挂载时从后端拉取消息列表
 *   - 缓存消息列表、提供乐观更新（已读、操作、删除）
 *   - 向 AppSidebar 提供未读数量（无需重复请求）
 *   - 向 MessagesPage 提供完整消息列表与操作接口
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Message, MessageStatus } from "../types/messages";
import {
  fetchMessages,
  markMessageRead,
  performMessageAction,
  deleteMessage,
  getCurrentUserId,
} from "../api/messages";

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export interface MessagesContextValue {
  messages: Message[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  /** Selected message ID (for detail panel) */
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Mark message as read (also called on select) */
  markRead: (id: string) => Promise<void>;
  /** Accept or reject an invitation / share request */
  performAction: (id: string, action: "accepted" | "rejected") => Promise<void>;
  /** Soft-delete a message */
  remove: (id: string) => Promise<void>;
  /** Re-fetch from server */
  refresh: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getCurrentUserId()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMessages();
      setMessages(res.messages);
    } catch {
      setError("消息加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    void load();
  }, [load]);

  // ---------------------------------------------------------------------------
  // Optimistic updater helpers
  // ---------------------------------------------------------------------------

  function patchStatus(id: string, status: MessageStatus) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m)),
    );
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const markRead = useCallback(async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.status !== "unread") return;
    patchStatus(id, "read");
    try {
      await markMessageRead(id);
    } catch {
      // Revert on failure
      patchStatus(id, "unread");
    }
  }, [messages]);

  const performAction = useCallback(
    async (id: string, action: "accepted" | "rejected") => {
      const prev = messages.find((m) => m.id === id)?.status;
      patchStatus(id, action);
      try {
        await performMessageAction(id, action);
      } catch {
        if (prev) patchStatus(id, prev);
      }
    },
    [messages],
  );

  const remove = useCallback(async (id: string) => {
    // Optimistic remove from list
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
    try {
      await deleteMessage(id);
    } catch {
      // Re-fetch to restore
      void load();
    }
  }, [selectedId, load]);

  const refresh = useCallback(() => load(), [load]);

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <MessagesContext.Provider
      value={{
        messages,
        unreadCount,
        loading,
        error,
        selectedId,
        select,
        markRead,
        performAction,
        remove,
        refresh,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be inside MessagesProvider");
  return ctx;
}
