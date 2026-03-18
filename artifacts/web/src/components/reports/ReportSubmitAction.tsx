/**
 * ReportSubmitAction.tsx
 *
 * Submit/status banner shown between the report content and the comment
 * thread. Handles the three rendering states driven by report.status:
 *
 *   draft / needs_revision  → call-to-action card with "提交周报" button
 *   submitted / under_review / reviewed → confirmation banner with week info
 *
 * Props:
 *   report   — the WeeklyReport being viewed
 *   onSubmit — async callback that submits the report; resolves with the
 *              updated WeeklyReport on success
 */

import { useState } from "react";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import type { WeeklyReport } from "@/types/weeklyReport";
import { fmtWeekLabel, fmtWeekRange } from "@/types/weeklyReport";

interface ReportSubmitActionProps {
  report: WeeklyReport;
  onSubmit: (id: string) => Promise<WeeklyReport>;
}

export function ReportSubmitAction({ report, onSubmit }: ReportSubmitActionProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit      = report.status === "draft" || report.status === "needs_revision";
  const alreadySubmitted =
    report.status === "submitted" ||
    report.status === "under_review" ||
    report.status === "reviewed";

  const weekLabel = fmtWeekLabel(report.weekStart);
  const weekRange = fmtWeekRange(
    report.dateRangeStart ?? report.weekStart,
    report.dateRangeEnd   ?? report.weekEnd,
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(report.id);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Already submitted banner ---
  if (alreadySubmitted) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
        <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">已提交给导师</p>
          <p className="text-xs text-green-600 mt-0.5">
            {weekLabel}（{weekRange}）
            {report.submittedAt
              ? `· 提交于 ${new Date(report.submittedAt).toLocaleString("zh-CN")}`
              : ""}
          </p>
        </div>
      </div>
    );
  }

  if (!canSubmit) return null;

  const isRevision = report.status === "needs_revision";

  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        isRevision ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {isRevision ? (
          <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
        ) : (
          <Send size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${isRevision ? "text-red-800" : "text-gray-700"}`}>
            {isRevision
              ? "导师要求修改，请修改后重新提交"
              : "汇总已完成，可以提交给导师了"}
          </p>
          <p className={`text-xs mt-0.5 ${isRevision ? "text-red-600" : "text-gray-500"}`}>
            将提交周报：<span className="font-medium">{weekLabel}</span>（{weekRange}）
          </p>
          {errorMsg && <p className="text-xs text-red-600 mt-1.5">{errorMsg}</p>}
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0 ${
            isRevision
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-900 hover:bg-gray-700 text-white"
          }`}
        >
          <Send size={13} />
          {submitting ? "提交中…" : isRevision ? "重新提交" : "提交周报"}
        </button>
      </div>
    </div>
  );
}
