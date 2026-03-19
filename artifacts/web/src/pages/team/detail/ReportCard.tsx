/**
 * ReportCard — 单份周报展示卡片
 *
 * 标题行：周次标签 | 标题（点击展开内容）| 展开指示
 * 属性行：提交日期 pill
 * 展开区：周报正文 + 关联实验记录列表（点击单条 → Sheet 只读详情）
 *
 * Layer: detail sub-component
 */

import { useState, useEffect } from "react";
import type { WeeklyReport } from "../../../types/team";
import { AttrPill } from "../../../components/team/AttrPill";
import {
  FlaskConical,
  Link2,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  ExternalLink,
} from "lucide-react";
import { fetchReportLinks } from "../../../api/weeklyReport";
import type { LinkedExperiment } from "../../../types/weeklyReport";
import { EXP_STATUS_COLORS } from "../../../types/weeklyReport";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";

export interface ReportCardProps {
  report: WeeklyReport;
}

// ---------------------------------------------------------------------------
// EXP_STATUS_LABELS — Chinese display labels for experiment status values
// ---------------------------------------------------------------------------
const EXP_STATUS_LABELS: Record<string, string> = {
  planned:     "计划中",
  in_progress: "进行中",
  completed:   "已完成",
  paused:      "已暂停",
  archived:    "已归档",
};

// ---------------------------------------------------------------------------
// LinkedExperimentSheet — read-only drill-down panel for one experiment
// ---------------------------------------------------------------------------

function LinkedExperimentSheet({
  experiment,
  open,
  onClose,
}: {
  experiment: LinkedExperiment | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!experiment) return null;

  const statusLabel = EXP_STATUS_LABELS[experiment.status] ?? experiment.status;
  const statusColor = EXP_STATUS_COLORS[experiment.status] ?? "bg-gray-100 text-gray-600";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-violet-50 p-2 shrink-0">
              <FlaskConical size={18} className="text-violet-500" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold text-gray-900 leading-snug">
                {experiment.title}
              </SheetTitle>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {experiment.sciNoteTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
            >
              <X size={18} />
            </button>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Status + date row */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
              {statusLabel}
            </span>
            {experiment.createdAt && (
              <span className="text-xs text-gray-400">
                创建于 {new Date(experiment.createdAt).toLocaleDateString("zh-CN")}
              </span>
            )}
          </div>

          {/* Purpose input */}
          {experiment.purposeInput ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                实验目的
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-3 border border-gray-100">
                {experiment.purposeInput}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                实验目的
              </p>
              <p className="text-sm text-gray-400 italic">未填写</p>
            </div>
          )}

          {/* Divider + notice */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-start gap-2 text-xs text-gray-400">
              <ExternalLink size={13} className="shrink-0 mt-0.5" />
              <span>
                如需查看完整实验记录（模块内容、数据、历史），请前往该成员的实验记录详情页。
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// LinkedExperimentsView — read-only list with click-to-drill-down (instructor)
// ---------------------------------------------------------------------------

function LinkedExperimentsView({ reportId }: { reportId: string }) {
  const [linked, setLinked]   = useState<LinkedExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [selected, setSelected] = useState<LinkedExperiment | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReportLinks(reportId)
      .then((res) => { if (!cancelled) { setLinked(res.experiments); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
        <Loader2 size={11} className="animate-spin" />
        加载关联实验…
      </div>
    );
  }

  if (linked.length === 0) return null;

  return (
    <>
      <div className="mt-3 border border-violet-100 rounded-lg overflow-hidden">
        {/* Section header — toggles list */}
        <button
          className="w-full flex items-center gap-2 px-3 py-2 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
          onClick={() => setListOpen((o) => !o)}
        >
          <Link2 size={12} className="text-violet-500 shrink-0" />
          <span className="text-xs font-medium text-violet-700 flex-1">
            关联实验记录 · {linked.length} 条
          </span>
          {listOpen
            ? <ChevronDown size={13} className="text-violet-400" />
            : <ChevronRight size={13} className="text-violet-400" />}
        </button>

        {/* Experiment rows — click to open drill-down */}
        {listOpen && (
          <div className="divide-y divide-gray-50 bg-white">
            {linked.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-50/60 transition-colors text-left group/row"
              >
                <FlaskConical size={13} className="text-gray-300 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 leading-snug group-hover/row:text-violet-700 transition-colors truncate">
                    {e.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{e.sciNoteTitle}</p>
                </div>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                    EXP_STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {EXP_STATUS_LABELS[e.status] ?? e.status}
                </span>
                <ChevronRight size={12} className="text-gray-300 shrink-0 group-hover/row:text-violet-400 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Drill-down sheet — rendered outside the card to avoid z-index / overflow issues */}
      <LinkedExperimentSheet
        experiment={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// ReportCard (main)
// ---------------------------------------------------------------------------

export function ReportCard({ report }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);

  const weekLabel = (() => {
    const d = new Date(report.weekStart + "T00:00:00");
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} 周`;
  })();

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm group">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Week tag */}
        <span className="flex-shrink-0 text-[10px] font-medium border rounded px-1.5 py-0.5 leading-none whitespace-nowrap bg-gray-100 text-gray-500 border-gray-200">
          {weekLabel}
        </span>

        {/* Title */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-1 text-sm font-medium text-gray-800 text-left hover:text-blue-700 transition-colors leading-snug min-w-0 truncate"
        >
          {report.title}
        </button>

        {/* Expand indicator */}
        <span className="flex-shrink-0 text-xs text-gray-300 group-hover:text-gray-500 transition-colors">
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Attribute pills */}
      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        <AttrPill
          label="提交"
          value={new Date(report.submittedAt).toLocaleDateString("zh-CN")}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50/40 rounded-b-lg">
          {report.content && (
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap mb-2">
              {report.content}
            </p>
          )}
          <LinkedExperimentsView reportId={report.id} />
        </div>
      )}
    </div>
  );
}
