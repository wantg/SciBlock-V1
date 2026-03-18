/**
 * AiReportDetailPanel — 自动汇总报告的结构化详情视图
 *
 * 职责：布局和编排。所有 section 渲染委托给 AiReportSections.tsx，
 * 提交逻辑委托给 ReportSubmitAction.tsx。
 *
 * 展示模块：
 *   • 汇总摘要 + 主题
 *   • 实验状态分布
 *   • 涉及项目
 *   • 本体操作摘要
 *   • 结果趋势
 *   • 参数变化
 *   • 溯源实验（可跳转到 Workbench）
 *   • 导师评论区
 */

import { Trash2 } from "lucide-react";
import { CommentThread } from "@/components/reports/CommentThread";
import { ReportStatusTag } from "@/components/reports/ReportStatusTag";
import { ReportSubmitAction } from "@/components/reports/ReportSubmitAction";
import {
  SummaryCard,
  StatusCard,
  ProjectSummaryCard,
  OperationCard,
  TrendsCard,
  ParamCard,
  ProvenanceCard,
} from "@/components/reports/AiReportSections";
import type { WeeklyReport, AiReportContent } from "@/types/weeklyReport";
import { parseAiContent, fmtDate } from "@/types/weeklyReport";

interface Props {
  report: WeeklyReport;
  userId: string;
  studentName: string;
  onDelete: (id: string) => Promise<void>;
  /** Called when student clicks "提交周报". Resolves with updated report. */
  onSubmit: (id: string) => Promise<WeeklyReport>;
}

export function AiReportDetailPanel({ report, userId, studentName, onDelete, onSubmit }: Props) {
  const content: AiReportContent | null = parseAiContent(report);

  const dateLabel =
    report.dateRangeStart && report.dateRangeEnd
      ? `${fmtDate(report.dateRangeStart)} – ${fmtDate(report.dateRangeEnd)}`
      : report.weekStart
      ? fmtDate(report.weekStart)
      : "时间段不详";

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
            <h2 className="text-xl font-semibold text-gray-900">{report.title}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-500">{dateLabel}</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                自动汇总
              </span>
              {report.experimentCount > 0 && (
                <>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{report.experimentCount} 条实验</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ReportStatusTag status={report.status} size="md" />
            <button
              onClick={handleDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="删除报告"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Generation failed notice */}
        {report.generationStatus === "failed" && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700 font-medium">
              报告汇总失败，请尝试删除后重新生成。
            </p>
          </div>
        )}

        {/* AI content sections */}
        {content ? (
          <div className="flex flex-col gap-3">
            <SummaryCard       content={content} />
            <StatusCard        dist={content.statusDistribution} />
            <ProjectSummaryCard items={content.projectSummary} />
            <OperationCard     steps={content.operationSummary} />
            <TrendsCard        trends={content.resultsTrends} />
            <ParamCard         params={content.parameterChanges} />
            <ProvenanceCard    experiments={content.provenanceExperiments} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center">
            <p className="text-sm text-gray-500">报告内容不可用，请尝试重新生成。</p>
          </div>
        )}

        {/* Submit action — only shown when AI content is available */}
        {content && (
          <div className="mt-3">
            <ReportSubmitAction report={report} onSubmit={onSubmit} />
          </div>
        )}

        {/* Comments */}
        <div className="mt-4 bg-white rounded-xl border border-gray-200 px-6 py-5">
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
