import React, { useState, useEffect } from "react";
import { fetchReportComments, addReportComment } from "@/api/weeklyReport";
import type { WeeklyReportComment, AddWeeklyReportCommentPayload } from "@/types/weeklyReport";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  reportId: string;
  /** The current user acting as author */
  author: {
    id: string;
    name: string;
    role: "instructor" | "student";
  };
  readOnly?: boolean;
}

export function CommentThread({ reportId, author, readOnly = false }: Props) {
  const [comments, setComments] = useState<WeeklyReportComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchReportComments(reportId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [reportId]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const payload: AddWeeklyReportCommentPayload = {
        authorId: author.id,
        authorName: author.name,
        authorRole: author.role,
        content: text.trim(),
      };
      const comment = await addReportComment(reportId, payload);
      setComments((prev) => [...prev, comment]);
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">评论</h4>

      {loading ? (
        <p className="text-sm text-gray-400">加载中…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 italic">暂无评论</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-gray-600">
                  {c.authorName.slice(0, 1)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-800">{c.authorName}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    c.authorRole === "instructor"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {c.authorRole === "instructor" ? "导师" : "学生"}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex gap-2 mt-1">
          <textarea
            rows={2}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="添加评论…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            className="self-end px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50 hover:bg-gray-700 transition-colors"
          >
            发送
          </button>
        </div>
      )}
    </div>
  );
}
