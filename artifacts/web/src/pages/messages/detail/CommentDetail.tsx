/**
 * CommentDetail — 实验评论消息详情
 *
 * Layer: component (pure, receives message + navigation callback)
 */

import React from "react";
import { MessageSquare, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import type { Message, CommentMeta } from "../../../types/messages";

interface Props {
  message: Message;
}

export function CommentDetail({ message }: Props) {
  const [, navigate] = useLocation();
  const meta = (message.metadata ?? {}) as unknown as CommentMeta;

  function handleViewExperiment() {
    if (meta.experimentId) {
      navigate(`/personal/experiment/${meta.experimentId}/workbench`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Icon + header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <MessageSquare size={18} className="text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-700">实验评论</p>
          <p className="text-sm font-bold text-gray-900 leading-snug">{message.title}</p>
        </div>
      </div>

      {/* Experiment reference */}
      {meta.experimentTitle && (
        <div className="border border-amber-100 rounded-xl p-4 bg-amber-50">
          <p className="text-[10px] text-amber-600 font-medium mb-1">实验记录</p>
          <p className="text-sm font-semibold text-amber-900">{meta.experimentTitle}</p>
        </div>
      )}

      {/* Comment bubble */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 font-medium">评论内容</p>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            「{meta.comment ?? message.body}」
          </p>
          <p className="text-[10px] text-gray-400 mt-2">— {message.senderName}</p>
        </div>
      </div>

      {/* View experiment button */}
      <button
        onClick={handleViewExperiment}
        className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
      >
        <ExternalLink size={14} />
        查看实验记录
      </button>
    </div>
  );
}
