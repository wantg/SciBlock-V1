/**
 * MessageDetail — 消息详情面板（右侧）
 *
 * Layer: component (reads from MessagesContext, dispatches to type-specific detail)
 *
 * 职责:
 *   - 根据 selectedId 找到消息
 *   - 将操作回调注入给类型专属组件
 *   - 显示发件人和时间等公共信息
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { useMessages } from "../../contexts/MessagesContext";
import { InvitationDetail } from "./detail/InvitationDetail";
import { CommentDetail } from "./detail/CommentDetail";
import { ShareRequestDetail } from "./detail/ShareRequestDetail";

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <span className="text-4xl">✉️</span>
      <p className="text-sm font-medium text-gray-700">选择一条消息查看详情</p>
      <p className="text-xs text-gray-400 leading-relaxed">
        点击左侧消息列表中的任意一条消息，即可在此查看完整内容。
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

export function MessageDetail() {
  const { messages, selectedId, performAction, remove } = useMessages();

  if (!selectedId) return <EmptyDetail />;

  const message = messages.find((m) => m.id === selectedId);
  if (!message) return <EmptyDetail />;

  const handleAccept = () => void performAction(message.id, "accepted");
  const handleReject = () => void performAction(message.id, "rejected");
  const handleDelete = () => void remove(message.id);

  return (
    <div className="flex flex-col h-full">
      {/* Common header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <p className="text-[10px] text-gray-400">
            来自 <span className="font-medium text-gray-600">{message.senderName}</span>
            {" · "}
            {new Date(message.createdAt).toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          onClick={handleDelete}
          title="删除消息"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Type-specific content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {message.type === "invitation" && (
          <InvitationDetail
            message={message}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
        {message.type === "comment" && (
          <CommentDetail message={message} />
        )}
        {message.type === "share_request" && (
          <ShareRequestDetail
            message={message}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
      </div>
    </div>
  );
}
