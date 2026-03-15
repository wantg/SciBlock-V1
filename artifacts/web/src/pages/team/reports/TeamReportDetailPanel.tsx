import React, { useState } from "react";
import { ReportStatusTag } from "@/components/reports/ReportStatusTag";
import { ReportContentView } from "@/components/reports/ReportContentView";
import { CommentThread } from "@/components/reports/CommentThread";
import type { StudentWithReport } from "@/hooks/reports/useTeamReports";
import type { WeeklyReportStatus, AddWeeklyReportCommentPayload } from "@/types/weeklyReport";
import { parseReportContent, fmtWeekRange } from "@/types/weeklyReport";

const STATUS_ACTIONS: Array<{ status: WeeklyReportStatus; label: string; cls: string }> = [
  { status: "under_review",   label: "标记为审阅中", cls: "border-yellow-300 text-yellow-700 hover:bg-yellow-50" },
  { status: "needs_revision", label: "要求修改",     cls: "border-red-300 text-red-700 hover:bg-red-50" },
  { status: "reviewed",       label: "标记为已批阅", cls: "border-green-300 text-green-700 hover:bg-green-50" },
];

interface Props {
  selected: StudentWithReport | null;
  weekStart: string;
  weekEnd: string;
  onChangeStatus: (
    reportId: string,
    status: WeeklyReportStatus,
    comment?: AddWeeklyReportCommentPayload,
  ) => Promise<void>;
}

export function TeamReportDetailPanel({ selected, weekStart, weekEnd, onChangeStatus }: Props) {
  const [feedbackText, setFeedbackText] = useState("");
  const [changing, setChanging] = useState(false);

  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem("sciblock:currentUser") ?? "{}").id ?? "instructor-1"; }
    catch { return "instructor-1"; }
  })();
  const currentUserName = (() => {
    try { return JSON.parse(localStorage.getItem("sciblock:currentUser") ?? "{}").name ?? "导师"; }
    catch { return "导师"; }
  })();

  if (!selected) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
        <p className="text-sm">从左侧选择学生</p>
      </div>
    );
  }

  const { report } = selected;

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-500 font-medium">{selected.name} 本周尚未提交周报</p>
          <p className="text-xs text-gray-400 mt-1">{fmtWeekRange(weekStart, weekEnd)}</p>
        </div>
      </div>
    );
  }

  const handleChangeStatus = async (status: WeeklyReportStatus) => {
    setChanging(true);
    try {
      const comment: AddWeeklyReportCommentPayload | undefined = feedbackText.trim()
        ? {
            authorId: currentUserId,
            authorName: currentUserName,
            authorRole: "instructor",
            content: feedbackText.trim(),
          }
        : undefined;
      await onChangeStatus(report.id, status, comment);
      setFeedbackText("");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{report.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selected.name} · {fmtWeekRange(report.weekStart, report.weekEnd)}
            </p>
          </div>
          <ReportStatusTag status={report.status} size="md" />
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-5">
          <ReportContentView content={parseReportContent(report)} />
        </div>

        {/* Review actions */}
        {report.status !== "reviewed" && (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">导师反馈</h4>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              placeholder="添加反馈意见（可选）…"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.map((a) => (
                <button
                  key={a.status}
                  onClick={() => handleChangeStatus(a.status)}
                  disabled={changing || report.status === a.status}
                  className={[
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50",
                    report.status === a.status
                      ? "opacity-50 cursor-not-allowed"
                      : a.cls,
                  ].join(" ")}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviewed state */}
        {report.status === "reviewed" && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 mb-5">
            <p className="text-sm text-green-700 font-medium">该周报已批阅完成</p>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <CommentThread
            reportId={report.id}
            author={{ id: currentUserId, name: currentUserName, role: "instructor" }}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  );
}
