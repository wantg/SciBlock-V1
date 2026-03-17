/**
 * AiReportDetailPanel — 自动汇总报告的结构化详情视图
 *
 * 展示 AI 生成的 AiReportContent 的各个模块：
 *   • 汇总摘要 + 主题
 *   • 实验状态分布
 *   • 涉及项目
 *   • 本体操作摘要
 *   • 结果趋势
 *   • 参数变化
 *   • 溯源实验（可跳转到 Workbench）
 *   • 导师评论区
 */

import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  FlaskConical, BarChart2, FolderOpen, ClipboardList,
  TrendingUp, Settings, Link2, Trash2, ChevronDown, ChevronRight,
  Send, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { CommentThread } from "@/components/reports/CommentThread";
import { ReportStatusTag } from "@/components/reports/ReportStatusTag";
import type { WeeklyReport, AiReportContent } from "@/types/weeklyReport";
import { parseAiContent, EXP_STATUS_COLORS, fmtDate } from "@/types/weeklyReport";

// ---------------------------------------------------------------------------
// Section card container
// ---------------------------------------------------------------------------

function SectionCard({
  icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm font-semibold text-gray-800 flex-1">{title}</span>
        {open ? (
          <ChevronDown size={15} className="text-gray-400" />
        ) : (
          <ChevronRight size={15} className="text-gray-400" />
        )}
      </button>
      {open && <div className="px-5 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({ content }: { content: AiReportContent }) {
  return (
    <SectionCard icon={<FlaskConical size={16} />} title="汇总摘要">
      <div className="flex flex-col gap-3">
        {content.theme && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 rounded px-2 py-0.5 mt-0.5 whitespace-nowrap">主题</span>
            <p className="text-sm text-gray-700 leading-relaxed">{content.theme}</p>
          </div>
        )}
        <p className="text-sm text-gray-700 leading-relaxed">{content.summary}</p>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Status distribution card
// ---------------------------------------------------------------------------

function StatusCard({ dist }: { dist: AiReportContent["statusDistribution"] }) {
  const bars = [
    { key: "探索中",  count: dist.exploring,   color: "bg-blue-400",   light: "text-blue-700 bg-blue-50" },
    { key: "可复现",  count: dist.reproducible, color: "bg-purple-400", light: "text-purple-700 bg-purple-50" },
    { key: "已验证",  count: dist.verified,     color: "bg-green-500",  light: "text-green-700 bg-green-50" },
    { key: "失败",    count: dist.failed,       color: "bg-red-400",    light: "text-red-700 bg-red-50" },
  ].filter((b) => b.count > 0);

  return (
    <SectionCard icon={<BarChart2 size={16} />} title="实验状态分布">
      <div className="flex flex-col gap-3">
        {/* Pills */}
        <div className="flex flex-wrap gap-2">
          {bars.map((b) => (
            <span key={b.key} className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.light}`}>
              {b.key} {b.count}
            </span>
          ))}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            共 {dist.total} 条
          </span>
        </div>
        {/* Mini bar chart */}
        {dist.total > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {bars.map((b) => (
              <div
                key={b.key}
                className={b.color}
                style={{ flex: b.count }}
                title={`${b.key}: ${b.count}`}
              />
            ))}
          </div>
        )}
        {/* Conclusion */}
        <p className="text-sm text-gray-600 leading-relaxed">{dist.conclusion}</p>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Project summary card
// ---------------------------------------------------------------------------

function ProjectSummaryCard({ items }: { items: AiReportContent["projectSummary"] }) {
  return (
    <SectionCard icon={<FolderOpen size={16} />} title="涉及项目">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">无项目数据</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {items.map((p) => (
            <div key={p.sciNoteId} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-800 truncate flex-1 mr-3">{p.sciNoteTitle}</span>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {p.experimentCount} 条实验
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Operation summary card
// ---------------------------------------------------------------------------

function OperationCard({ steps }: { steps: AiReportContent["operationSummary"] }) {
  return (
    <SectionCard icon={<ClipboardList size={16} />} title="实验操作摘要" defaultOpen={false}>
      {steps.length === 0 ? (
        <p className="text-sm text-gray-400">暂无操作数据</p>
      ) : (
        <div className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center justify-center mt-0.5 flex-shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.step}</p>
                {s.note && <p className="text-xs text-gray-500 mt-0.5">{s.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Results trends card
// ---------------------------------------------------------------------------

function TrendsCard({ trends }: { trends: AiReportContent["resultsTrends"] }) {
  return (
    <SectionCard icon={<TrendingUp size={16} />} title="结果与趋势" defaultOpen={false}>
      {trends.length === 0 ? (
        <p className="text-sm text-gray-400">暂无趋势数据</p>
      ) : (
        <div className="flex flex-col gap-3">
          {trends.map((t, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    t.hasClearTrend
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {t.direction}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{t.finding}</p>
              {t.relatedExperiments.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5 truncate">
                  涉及：{t.relatedExperiments.slice(0, 3).join("、")}
                  {t.relatedExperiments.length > 3 && ` 等 ${t.relatedExperiments.length} 条`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Parameter changes card
// ---------------------------------------------------------------------------

function ParamCard({ params }: { params: AiReportContent["parameterChanges"] }) {
  return (
    <SectionCard icon={<Settings size={16} />} title="参数变化" defaultOpen={false}>
      {params.length === 0 ? (
        <p className="text-sm text-gray-400">本时间段内未检测到跨实验参数变化</p>
      ) : (
        <div className="flex flex-col gap-3">
          {params.map((p, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-800 mb-1">{p.paramName}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{p.changeDescription}</p>
              <p className="text-xs text-gray-500 mt-1.5 italic">{p.impact}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Provenance card (links to workbench)
// ---------------------------------------------------------------------------

function ProvenanceCard({ experiments }: { experiments: AiReportContent["provenanceExperiments"] }) {
  const [, navigate] = useLocation();

  return (
    <SectionCard icon={<Link2 size={16} />} title="实验溯源" defaultOpen={false}>
      {experiments.length === 0 ? (
        <p className="text-sm text-gray-400">无溯源实验</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {experiments.map((e) => (
            <button
              key={e.id}
              onClick={() => navigate(`/personal/experiment/${e.sciNoteId}/workbench?experimentId=${e.id}`)}
              className="flex items-center gap-3 py-2.5 text-left group hover:bg-gray-50 -mx-1 px-1 rounded-lg transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate group-hover:text-violet-700 transition-colors">
                  {e.title}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {e.sciNoteTitle} · {e.date}
                </p>
              </div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                  EXP_STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {e.status}
              </span>
              <ChevronRight size={13} className="text-gray-300 group-hover:text-violet-500 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// AiReportDetailPanel (main)
// ---------------------------------------------------------------------------

interface Props {
  report: WeeklyReport;
  userId: string;
  studentName: string;
  onDelete: (id: string) => Promise<void>;
  /** Called when student clicks "提交周报". Receives only the report id. */
  onSubmit: (id: string) => Promise<WeeklyReport>;
}

// ---------------------------------------------------------------------------
// Submit action section
// ---------------------------------------------------------------------------

/**
 * SubmitAction — shown between report content and comments.
 *
 * Rendering rules (driven by report.status):
 *  draft           → call-to-action card with "提交周报" button
 *  needs_revision  → warning card with "重新提交" button
 *  submitted / under_review / reviewed → "已提交" confirmation banner
 */
function SubmitAction({
  report,
  onSubmit,
}: {
  report: WeeklyReport;
  onSubmit: (id: string) => Promise<WeeklyReport>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = report.status === "draft" || report.status === "needs_revision";
  const alreadySubmitted =
    report.status === "submitted" ||
    report.status === "under_review" ||
    report.status === "reviewed";

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(report.id);
      // report prop updates from parent after the submit succeeds
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "提交失败，请稍后重试";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
        <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">已提交给导师</p>
          {report.submittedAt && (
            <p className="text-xs text-green-600 mt-0.5">
              提交时间：{new Date(report.submittedAt).toLocaleString("zh-CN")}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!canSubmit) return null;

  const isRevision = report.status === "needs_revision";

  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        isRevision
          ? "bg-red-50 border-red-200"
          : "bg-gray-50 border-gray-200"
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
            {isRevision ? "导师要求修改，请修改后重新提交" : "汇总已完成，可以提交给导师了"}
          </p>
          {!isRevision && (
            <p className="text-xs text-gray-500 mt-0.5">
              提交后导师即可查看这份汇总报告
            </p>
          )}
          {errorMsg && (
            <p className="text-xs text-red-600 mt-1.5">{errorMsg}</p>
          )}
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

// ---------------------------------------------------------------------------
// AiReportDetailPanel (main)
// ---------------------------------------------------------------------------

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
            <p className="text-sm text-red-700 font-medium">报告汇总失败，请尝试删除后重新生成。</p>
          </div>
        )}

        {/* AI content sections */}
        {content ? (
          <div className="flex flex-col gap-3">
            <SummaryCard content={content} />
            <StatusCard dist={content.statusDistribution} />
            <ProjectSummaryCard items={content.projectSummary} />
            <OperationCard steps={content.operationSummary} />
            <TrendsCard trends={content.resultsTrends} />
            <ParamCard params={content.parameterChanges} />
            <ProvenanceCard experiments={content.provenanceExperiments} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center">
            <p className="text-sm text-gray-500">报告内容不可用，请尝试重新生成。</p>
          </div>
        )}

        {/* Submit action — only shown for student-owned reports with generated content */}
        {content && (
          <div className="mt-3">
            <SubmitAction report={report} onSubmit={onSubmit} />
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
