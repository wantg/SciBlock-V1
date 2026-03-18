/**
 * AiReportSections.tsx
 *
 * Pure presentation components for rendering the structured sections of an
 * AI-generated weekly report (AiReportContent).
 *
 * Components exported:
 *   SectionCard         — collapsible card wrapper used by all section cards
 *   SummaryCard         — 汇总摘要 + 主题
 *   StatusCard          — 实验状态分布 (mini bar chart + conclusion)
 *   ProjectSummaryCard  — 涉及项目 (list with experiment count)
 *   OperationCard       — 实验操作摘要 (numbered steps)
 *   TrendsCard          — 结果与趋势
 *   ParamCard           — 参数变化
 *   ProvenanceCard      — 实验溯源 (links into Workbench)
 *
 * Design rules:
 *   - All components are stateless except SectionCard (open/closed toggle).
 *   - No data fetching, no side effects, no routing side effects except
 *     ProvenanceCard which navigates to the Workbench via wouter.
 *   - Styling uses Tailwind only — no external CSS.
 */

import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  FlaskConical, BarChart2, FolderOpen, ClipboardList,
  TrendingUp, Settings, Link2, ChevronDown, ChevronRight,
} from "lucide-react";
import type { AiReportContent } from "@/types/weeklyReport";
import { EXP_STATUS_COLORS } from "@/types/weeklyReport";

// ---------------------------------------------------------------------------
// SectionCard — collapsible container used by every section
// ---------------------------------------------------------------------------

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  /** Whether the card is expanded on first render. Defaults to true. */
  defaultOpen?: boolean;
}

export function SectionCard({ icon, title, children, defaultOpen = true }: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm font-semibold text-gray-800 flex-1">{title}</span>
        {open
          ? <ChevronDown  size={15} className="text-gray-400" />
          : <ChevronRight size={15} className="text-gray-400" />
        }
      </button>
      {open && <div className="px-5 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard — 汇总摘要 + 研究主题
// ---------------------------------------------------------------------------

export function SummaryCard({ content }: { content: AiReportContent }) {
  return (
    <SectionCard icon={<FlaskConical size={16} />} title="汇总摘要">
      <div className="flex flex-col gap-3">
        {content.theme && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 rounded px-2 py-0.5 mt-0.5 whitespace-nowrap">
              主题
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">{content.theme}</p>
          </div>
        )}
        <p className="text-sm text-gray-700 leading-relaxed">{content.summary}</p>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// StatusCard — 实验状态分布（pills + mini bar chart + conclusion）
// ---------------------------------------------------------------------------

const STATUS_BAR_COLORS: Record<
  string,
  { bar: string; pill: string }
> = {
  "探索中": { bar: "bg-blue-400",   pill: "text-blue-700 bg-blue-50" },
  "可复现": { bar: "bg-purple-400", pill: "text-purple-700 bg-purple-50" },
  "已验证": { bar: "bg-green-500",  pill: "text-green-700 bg-green-50" },
  "失败":   { bar: "bg-red-400",    pill: "text-red-700 bg-red-50" },
};

export function StatusCard({ dist }: { dist: AiReportContent["statusDistribution"] }) {
  const bars = [
    { key: "探索中", count: dist.exploring },
    { key: "可复现", count: dist.reproducible },
    { key: "已验证", count: dist.verified },
    { key: "失败",   count: dist.failed },
  ].filter((b) => b.count > 0);

  return (
    <SectionCard icon={<BarChart2 size={16} />} title="实验状态分布">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {bars.map((b) => (
            <span
              key={b.key}
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BAR_COLORS[b.key]?.pill ?? "bg-gray-100 text-gray-600"}`}
            >
              {b.key} {b.count}
            </span>
          ))}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            共 {dist.total} 条
          </span>
        </div>

        {dist.total > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {bars.map((b) => (
              <div
                key={b.key}
                className={STATUS_BAR_COLORS[b.key]?.bar ?? "bg-gray-300"}
                style={{ flex: b.count }}
                title={`${b.key}: ${b.count}`}
              />
            ))}
          </div>
        )}

        <p className="text-sm text-gray-600 leading-relaxed">{dist.conclusion}</p>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// ProjectSummaryCard — 涉及项目列表
// ---------------------------------------------------------------------------

export function ProjectSummaryCard({ items }: { items: AiReportContent["projectSummary"] }) {
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
// OperationCard — 实验操作摘要（numbered steps，默认折叠）
// ---------------------------------------------------------------------------

export function OperationCard({ steps }: { steps: AiReportContent["operationSummary"] }) {
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
// TrendsCard — 结果与趋势（默认折叠）
// ---------------------------------------------------------------------------

export function TrendsCard({ trends }: { trends: AiReportContent["resultsTrends"] }) {
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
                    t.hasClearTrend ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
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
// ParamCard — 参数变化（默认折叠）
// ---------------------------------------------------------------------------

export function ParamCard({ params }: { params: AiReportContent["parameterChanges"] }) {
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
// ProvenanceCard — 实验溯源（可跳转 Workbench，默认折叠）
// ---------------------------------------------------------------------------

export function ProvenanceCard({
  experiments,
}: {
  experiments: AiReportContent["provenanceExperiments"];
}) {
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
              onClick={() =>
                navigate(`/personal/experiment/${e.sciNoteId}/workbench?experimentId=${e.id}`)
              }
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
              <ChevronRight
                size={13}
                className="text-gray-300 group-hover:text-violet-500 transition-colors flex-shrink-0"
              />
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
