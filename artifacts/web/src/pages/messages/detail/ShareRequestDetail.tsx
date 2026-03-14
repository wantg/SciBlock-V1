/**
 * ShareRequestDetail — 分享请求消息详情
 *
 * Layer: component (pure, receives message + callbacks)
 */

import React from "react";
import { Share2, CheckCircle, XCircle } from "lucide-react";
import type { Message, ShareRequestMeta } from "../../../types/messages";

interface Props {
  message: Message;
  onAccept: () => void;
  onReject: () => void;
}

export function ShareRequestDetail({ message, onAccept, onReject }: Props) {
  const meta = (message.metadata ?? {}) as unknown as ShareRequestMeta;
  const isActioned = message.status === "accepted" || message.status === "rejected";

  return (
    <div className="flex flex-col gap-6">
      {/* Icon + header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Share2 size={18} className="text-green-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-green-700">分享请求</p>
          <p className="text-sm font-bold text-gray-900 leading-snug">{message.title}</p>
        </div>
      </div>

      {/* Body */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
        {message.body}
      </div>

      {/* Experiment reference */}
      {meta.experimentTitle && (
        <div className="border border-green-100 rounded-xl p-4 bg-green-50">
          <p className="text-[10px] text-green-600 font-medium mb-1">请求分享的实验记录</p>
          <p className="text-sm font-semibold text-green-900">{meta.experimentTitle}</p>
        </div>
      )}

      {/* Action buttons */}
      {isActioned ? (
        <div
          className={[
            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
            message.status === "accepted"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          {message.status === "accepted" ? (
            <><CheckCircle size={14} /> 已同意分享</>
          ) : (
            <><XCircle size={14} /> 已拒绝请求</>
          )}
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-green-700 transition-colors"
          >
            <CheckCircle size={14} />
            同意分享
          </button>
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <XCircle size={14} />
            拒绝
          </button>
        </div>
      )}
    </div>
  );
}
