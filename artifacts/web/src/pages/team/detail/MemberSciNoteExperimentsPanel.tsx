/**
 * MemberSciNoteExperimentsPanel — 右侧面板：某项目下的全部实验记录。
 *
 * Layer: component (pure UI — no context, no routing logic beyond navigation).
 *
 * 使用场景：成员详情页双栏模式的右侧面板。
 * 展示被查看成员在某项目下的真实实验记录（instructor-only 数据链路）。
 *
 * 数据来源：useMemberSciNoteExperiments(memberUserId, sciNote.id)
 *   → GET /api/instructor/members/:userId/scinotes/:sciNoteId/experiments
 *   → 被查看成员自己的实验记录，不是登录用户的数据。
 */

import { useLocation } from "wouter";
import { X, FlaskConical } from "lucide-react";
import { useMemberSciNoteExperiments } from "@/hooks/team/useMemberSciNoteExperiments";
import { STATUS_DOT_CLASS, STATUS_TEXT_CLASS } from "@/types/calendarPanel";
import type { SciNote } from "@/types/scinote";
import type { ExperimentRecord, ExperimentStatus } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Single experiment record row
// ---------------------------------------------------------------------------

interface ExperimentRowProps {
  record:  ExperimentRecord;
  onClick: () => void;
}

function ExperimentRow({ record, onClick }: ExperimentRowProps) {
  const status = record.experimentStatus as ExperimentStatus;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg px-3 py-2.5 flex items-start gap-2.5 hover:bg-gray-50 transition-colors group"
    >
      {/* Status dot */}
      <span
        className={[
          "flex-shrink-0 w-2 h-2 rounded-full mt-[5px]",
          STATUS_DOT_CLASS[status] ?? "bg-gray-300",
        ].join(" ")}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-snug truncate">
          {record.title || "（未命名实验）"}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className={[
              "text-xs font-medium",
              STATUS_TEXT_CLASS[status] ?? "text-gray-500",
            ].join(" ")}
          >
            {status}
          </span>
          <span className="text-gray-200 text-xs leading-none">·</span>
          <time dateTime={record.createdAt} className="text-xs text-gray-400">
            {new Date(record.createdAt).toLocaleDateString("zh-CN", {
              year:  "numeric",
              month: "2-digit",
              day:   "2-digit",
            })}
          </time>
        </div>
      </div>

      {/* Arrow */}
      <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-sm mt-0.5 flex-shrink-0">
        ›
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface Props {
  sciNote:      SciNote;
  memberUserId: string | null;
  /** student.id (Express profile ID) — used to build the member-scoped detail URL. */
  memberId:     string;
  onClose:      () => void;
}

export function MemberSciNoteExperimentsPanel({ sciNote, memberUserId, memberId, onClose }: Props) {
  const [, navigate] = useLocation();
  const { experiments, loading, error } = useMemberSciNoteExperiments(
    memberUserId,
    sciNote.id,
  );

  const sorted = [...experiments].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  function handleOpenRecord(record: ExperimentRecord) {
    navigate(
      `/home/members/${memberId}/experiment/${record.sciNoteId}/${record.id}`,
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-none mb-1">
            项目
          </p>
          <h2 className="text-sm font-semibold text-gray-900 leading-snug">
            {sciNote.title}
          </h2>
          {!loading && (
            <p className="text-xs text-gray-400 mt-0.5">
              {sorted.length} 条实验记录
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          aria-label="关闭实验记录面板"
          className="flex-shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Body — scrollable list ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2">

        {loading && (
          <div className="flex items-center justify-center py-10 gap-2">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-400">加载中…</span>
          </div>
        )}

        {!loading && error && (
          <p className="text-xs text-red-400 text-center py-8 px-4">{error}</p>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <FlaskConical size={24} className="text-gray-200" />
            <p className="text-xs text-gray-400">该项目暂无实验记录</p>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="px-2">
            {sorted.map((record) => (
              <ExperimentRow
                key={record.id}
                record={record}
                onClick={() => handleOpenRecord(record)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
