/**
 * MessageListItem — 消息列表的单行组件
 *
 * Layer: component (pure, controlled by parent)
 */

import React from "react";
import { UserRound, MessageSquare, Share2, Trash2 } from "lucide-react";
import type { Message, MessageType } from "../../types/messages";
import { MESSAGE_TYPE_LABELS, MESSAGE_TYPE_COLORS } from "../../types/messages";

// ---------------------------------------------------------------------------
// Icon per type
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<MessageType, React.ElementType> = {
  invitation:    UserRound,
  comment:       MessageSquare,
  share_request: Share2,
};

// ---------------------------------------------------------------------------
// Time formatter
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)  return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7)  return `${days} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  message: Message;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function MessageListItem({ message, isSelected, onSelect, onDelete }: Props) {
  const Icon   = TYPE_ICONS[message.type as MessageType] ?? UserRound;
  const colors = MESSAGE_TYPE_COLORS[message.type as MessageType];
  const isUnread = message.status === "unread";

  return (
    <div
      role="button"
      onClick={onSelect}
      className={[
        "group relative flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-gray-100"
          : "hover:bg-gray-50",
      ].join(" ")}
    >
      {/* Type icon */}
      <div
        className={[
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          colors?.bg ?? "bg-gray-100",
        ].join(" ")}
      >
        <Icon size={14} className={colors?.text ?? "text-gray-500"} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row: type badge + time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={[
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              colors?.bg ?? "bg-gray-100",
              colors?.text ?? "text-gray-600",
            ].join(" ")}
          >
            {MESSAGE_TYPE_LABELS[message.type as MessageType] ?? message.type}
          </span>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>

        {/* Title */}
        <p
          className={[
            "text-xs leading-snug truncate",
            isUnread ? "font-semibold text-gray-900" : "font-normal text-gray-700",
          ].join(" ")}
        >
          {message.title}
        </p>

        {/* Sender */}
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
          来自 {message.senderName}
        </p>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <span
          className={[
            "absolute right-3 top-3.5 w-1.5 h-1.5 rounded-full flex-shrink-0",
            colors?.dot ?? "bg-gray-400",
          ].join(" ")}
        />
      )}

      {/* Delete button — visible on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="删除消息"
        className="absolute bottom-2 right-2 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
