/**
 * ExperimentRecordsCard — SciNote（项目）列表入口组件。
 *
 * Layer: component (presentational — no data fetching).
 *
 * 职责：展示成员的 SciNote 列表，点击某个项目名触发 onSelectSciNote 回调，
 * 由父组件（MemberDetailPage）决定如何响应（展开右侧面板）。
 * 本组件不负责导航，不知道面板的存在。
 *
 * 数据由父组件通过 props 传入，数据来源是 useMemberSciNotes(student.userId)，
 * 即被查看成员自己的 SciNotes（不再使用登录用户的 SciNoteStore）。
 */

import { useState } from "react";
import type { SciNote } from "../../../types/scinote";

const INITIAL_LIMIT = 5;

// ---------------------------------------------------------------------------
// Kind tag config
// ---------------------------------------------------------------------------

const KIND_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  standard:         { label: "标准",   bg: "bg-gray-100",    text: "text-gray-500",    border: "border-gray-200" },
  material:         { label: "材料",   bg: "bg-blue-50",     text: "text-blue-600",    border: "border-blue-200" },
  synthesis:        { label: "合成",   bg: "bg-emerald-50",  text: "text-emerald-600", border: "border-emerald-200" },
  characterization: { label: "表征",   bg: "bg-violet-50",   text: "text-violet-600",  border: "border-violet-200" },
  test:             { label: "测试",   bg: "bg-amber-50",    text: "text-amber-600",   border: "border-amber-200" },
};

function kindMeta(kind: SciNote["kind"]) {
  return KIND_META[kind] ?? { label: kind, bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" };
}

// ---------------------------------------------------------------------------
// Single project row
// ---------------------------------------------------------------------------

interface RecordRowProps {
  note:            SciNote;
  isSelected:      boolean;
  onClick:         () => void;
}

function RecordRow({ note, isSelected, onClick }: RecordRowProps) {
  const meta = kindMeta(note.kind);

  return (
    <div
      className={[
        "border rounded-xl shadow-sm group transition-colors",
        isSelected
          ? "bg-gray-900 border-gray-900"
          : "bg-white border-gray-100 hover:border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Kind tag */}
        <span
          className={[
            "flex-shrink-0 text-[10px] font-medium border rounded px-1.5 py-0.5 leading-none whitespace-nowrap",
            isSelected
              ? "bg-white/10 text-white/80 border-white/20"
              : `${meta.bg} ${meta.text} ${meta.border}`,
          ].join(" ")}
        >
          {meta.label}
        </span>

        {/* Title — click triggers onSelectSciNote */}
        <button
          onClick={onClick}
          className={[
            "flex-1 text-sm font-medium text-left leading-snug min-w-0 truncate transition-colors",
            isSelected
              ? "text-white"
              : "text-gray-800 hover:text-blue-700",
          ].join(" ")}
          title={isSelected ? "点击收起" : "点击查看该项目下的实验记录"}
        >
          {note.title || "无标题实验"}
        </button>

        {/* Experiment count badge */}
        {note.experimentCount !== undefined && (
          <span
            className={[
              "flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
              isSelected
                ? "bg-white/15 text-white/80"
                : "bg-gray-100 text-gray-500",
            ].join(" ")}
            title={`${note.experimentCount} 条实验记录`}
          >
            {note.experimentCount}
          </span>
        )}

        {/* Arrow / indicator */}
        <span
          className={[
            "flex-shrink-0 text-sm transition-colors",
            isSelected ? "text-white/60" : "text-gray-300 group-hover:text-gray-500",
          ].join(" ")}
        >
          {isSelected ? "✕" : "›"}
        </span>
      </div>

      {/* Created at pill — only in unselected state */}
      {note.createdAt && !isSelected && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center bg-slate-100 rounded-full px-2.5 py-0.5">
            <span className="text-xs text-slate-500">
              创建时间: {new Date(note.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ExperimentRecordsCardProps {
  /** All SciNotes belonging to the viewed member (from useMemberSciNotes). */
  notes:   SciNote[];
  loading: boolean;
  error:   string | null;
  /** Called when the user clicks a project row. Clicking the same row again
   *  deselects it (handled by the parent). */
  onSelectSciNote:   (note: SciNote) => void;
  /** The currently selected SciNote ID; used for visual highlight. */
  selectedSciNoteId: string | null;
}

export default function ExperimentRecordsCard({
  notes,
  loading,
  error,
  onSelectSciNote,
  selectedSciNoteId,
}: ExperimentRecordsCardProps) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2">
        <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        <span className="text-xs text-gray-400">加载中…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-400 py-4 text-center">{error}</p>
    );
  }

  const sorted = [...notes].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_LIMIT);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
        <p className="text-xs text-gray-400">该成员暂无实验记录</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {visible.map((note) => (
          <RecordRow
            key={note.id}
            note={note}
            isSelected={note.id === selectedSciNoteId}
            onClick={() => onSelectSciNote(note)}
          />
        ))}
      </div>

      {sorted.length > INITIAL_LIMIT && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="mt-2 w-full inline-flex items-center justify-center gap-0.5 text-xs text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full py-1 transition-colors"
        >
          {showAll ? "收起" : `查看全部 ${sorted.length} 条`}
        </button>
      )}
    </div>
  );
}
