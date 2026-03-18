/**
 * ReportReviewActions
 *
 * The instructor-facing review panel shown inside TeamReportDetailPanel.
 * Presents two outcome actions ("批阅通过" / "要求修改") along with an optional
 * feedback textarea. Delegates submission to the `onReview` callback so all
 * state and API logic live in the hook, not this component.
 *
 * Rules:
 *  - No direct API calls — all data flows through props.
 *  - No business logic — only presentation and local input state.
 *  - Already-reviewed reports show a read-only banner, not the action buttons.
 */

import React, { useState } from "react";
import { CheckCircle, RefreshCw } from "lucide-react";
import type { ReviewAction } from "@/types/weeklyReport";
import type { WeeklyReport } from "@/types/weeklyReport";

interface Props {
  report: WeeklyReport;
  onReview: (action: ReviewAction, feedbackText?: string) => Promise<void>;
}

const REVIEW_BUTTONS: Array<{
  action: ReviewAction;
  label: string;
  cls: string;
  activeStatus: string;
}> = [
  {
    action: "approve",
    label: "批阅通过",
    cls: "border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50",
    activeStatus: "reviewed",
  },
  {
    action: "request_revision",
    label: "要求修改",
    cls: "border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50",
    activeStatus: "needs_revision",
  },
];

export function ReportReviewActions({ report, onReview }: Props) {
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (action: ReviewAction) => {
    setSubmitting(true);
    try {
      await onReview(action, feedbackText.trim() || undefined);
      setFeedbackText("");
    } finally {
      setSubmitting(false);
    }
  };

  if (report.status === "reviewed") {
    const reviewedDate = report.reviewedAt
      ? new Date(report.reviewedAt).toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

    return (
      <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle size={16} className="text-green-600" />
          <p className="text-sm text-green-800 font-semibold">该周报已批阅完成</p>
        </div>
        {reviewedDate && (
          <p className="text-xs text-green-600 ml-6">批阅时间：{reviewedDate}</p>
        )}
        <button
          onClick={() => handleAction("request_revision")}
          disabled={submitting}
          className="mt-3 ml-6 inline-flex items-center gap-1 text-xs text-green-700 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} />
          撤回，要求重新修改
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-5">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">导师批阅</h4>
      <textarea
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 placeholder:text-gray-400"
        placeholder="批阅意见（可选）— 若填写，将同时发送给学生作为评论"
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        disabled={submitting}
      />
      <div className="flex flex-wrap gap-2">
        {REVIEW_BUTTONS.map((btn) => (
          <button
            key={btn.action}
            onClick={() => handleAction(btn.action)}
            disabled={submitting || report.status === btn.activeStatus}
            className={[
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
              report.status === btn.activeStatus
                ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400"
                : btn.cls,
            ].join(" ")}
          >
            {submitting ? "处理中…" : btn.label}
          </button>
        ))}
      </div>
      {report.status === "needs_revision" && (
        <p className="mt-2 text-xs text-red-500">当前状态：已要求学生修改</p>
      )}
    </div>
  );
}
