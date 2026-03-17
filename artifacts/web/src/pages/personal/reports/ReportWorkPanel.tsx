/**
 * ReportWorkPanel — 历史手动周报查看 / 有限编辑面板
 *
 * 职责：
 *   - 主要用于查看已存在的手动周报（generationStatus = idle/null）
 *   - draft / needs_revision 状态下提供编辑和提交功能；其余状态只读
 *   - report = null 时渲染空状态占位，提示用户从左侧选择周报
 *
 * 注意：
 *   新建周报的唯一入口是 GenerateReportWizard（自动汇总向导），
 *   本组件不承担任何新建逻辑。
 */
import React, { useState, useEffect } from "react";
import { ReportStatusTag } from "@/components/reports/ReportStatusTag";
import { ReportContentForm } from "@/components/reports/ReportContentForm";
import { ReportContentView } from "@/components/reports/ReportContentView";
import { CommentThread } from "@/components/reports/CommentThread";
import type { WeeklyReport, WeeklyReportContent } from "@/types/weeklyReport";
import { EMPTY_REPORT_CONTENT, parseReportContent, fmtWeekRange } from "@/types/weeklyReport";

interface Props {
  report: WeeklyReport | null;
  studentId: string;
  studentName: string;
  userId: string;
  onSave: (id: string, content: WeeklyReportContent, title?: string) => Promise<WeeklyReport>;
  onSubmit: (id: string, content: WeeklyReportContent, title?: string) => Promise<WeeklyReport>;
  onDelete: (id: string) => Promise<void>;
  onReportUpdated: (updated: WeeklyReport) => void;
}

export function ReportWorkPanel({
  report,
  studentId,
  studentName,
  userId,
  onSave,
  onSubmit,
  onDelete,
  onReportUpdated,
}: Props) {
  const [content, setContent] = useState<WeeklyReportContent>(EMPTY_REPORT_CONTENT);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      setContent(parseReportContent(report));
      setTitle(report.title);
      setMessage(null);
    }
  }, [report?.id]);

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
        <p className="text-sm">从左侧选择一份周报</p>
      </div>
    );
  }

  const isEditable = report.status === "draft" || report.status === "needs_revision";
  const isReadOnly = !isEditable;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await onSave(report.id, content, title);
      onReportUpdated(updated);
      setMessage("已保存草稿");
    } catch {
      setMessage("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.completed.trim() || !content.progress.trim() || !content.nextWeekPlan.trim()) {
      setMessage("请至少填写「本周完成内容」「当前实验进展」「下周计划」");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await onSubmit(report.id, content, title);
      onReportUpdated(updated);
      setMessage("提交成功！");
    } catch {
      setMessage("提交失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确认删除「${report.title}」？此操作不可撤销。`)) return;
    await onDelete(report.id);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0 mr-4">
            {isEditable ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-semibold text-gray-900 bg-transparent border-0 border-b-2 border-gray-200 focus:outline-none focus:border-blue-500 w-full pb-1 transition-colors"
                placeholder="周报标题…"
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{report.title}</h2>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {fmtWeekRange(report.weekStart, report.weekEnd)}
            </p>
          </div>
          <ReportStatusTag status={report.status} size="md" />
        </div>

        {/* Needs-revision notice */}
        {report.status === "needs_revision" && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700 font-medium">导师要求修改，请根据评论修改后重新提交。</p>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-5">
          {isEditable ? (
            <ReportContentForm value={content} onChange={setContent} />
          ) : (
            <ReportContentView content={parseReportContent(report)} />
          )}
        </div>

        {/* Actions */}
        {isEditable && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              保存草稿
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              提交周报
            </button>
            <button
              onClick={handleDelete}
              className="ml-auto px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              删除
            </button>
            {message && (
              <span className="text-sm text-gray-500">{message}</span>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <CommentThread
            reportId={report.id}
            author={{ id: userId, name: studentName, role: "student" }}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  );
}
