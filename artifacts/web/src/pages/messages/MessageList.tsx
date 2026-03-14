/**
 * MessageList — 消息列表面板（左侧）
 *
 * Layer: component (reads from MessagesContext)
 */

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useMessages } from "../../contexts/MessagesContext";
import { MessageListItem } from "./MessageListItem";
import type { MessageType } from "../../types/messages";
import { MESSAGE_TYPE_LABELS } from "../../types/messages";

type FilterKey = "all" | MessageType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",          label: "全部" },
  { key: "invitation",   label: "邀请" },
  { key: "comment",      label: "评论" },
  { key: "share_request",label: "分享" },
];

export function MessageList() {
  const { messages, loading, error, selectedId, unreadCount, select, markRead, remove, refresh } =
    useMessages();
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = messages.filter(
    (m) => filter === "all" || m.type === filter,
  );

  async function handleSelect(id: string) {
    select(id);
    await markRead(id);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">消息</span>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-gray-900 text-white rounded-full px-1.5 py-0.5 font-medium leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          title="刷新"
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 flex-shrink-0">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={[
              "text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
              filter === key
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:bg-gray-100",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Message rows */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {error && (
          <p className="text-xs text-red-500 text-center py-4">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-2xl">📭</span>
            <p className="text-xs text-gray-400">暂无消息</p>
          </div>
        )}

        {filtered.map((msg) => (
          <MessageListItem
            key={msg.id}
            message={msg}
            isSelected={selectedId === msg.id}
            onSelect={() => void handleSelect(msg.id)}
            onDelete={() => void remove(msg.id)}
          />
        ))}
      </div>
    </div>
  );
}
