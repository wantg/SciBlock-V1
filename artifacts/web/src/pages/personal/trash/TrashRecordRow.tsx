import React, { useState } from "react";
import { RotateCcw, Trash2, Clock, Tag } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { DeletedRecord } from "@/types/trash";
import type { ExperimentStatus } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Status badge colours (mirrors StatusPicker palette)
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<ExperimentStatus, string> = {
  探索中: "bg-blue-50 text-blue-700 border-blue-200",
  可复现: "bg-emerald-50 text-emerald-700 border-emerald-200",
  失败:   "bg-red-50 text-red-600 border-red-200",
  已验证: "bg-violet-50 text-violet-700 border-violet-200",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  entry: DeletedRecord;
  onRestore: () => void;
  onPermanentDelete: () => void;
}

/**
 * TrashRecordRow — one row in the trash list.
 *
 * Shows:
 *   - Experiment title (fallback "未命名实验")
 *   - SciNote it belonged to
 *   - Status badge at deletion time
 *   - Deletion timestamp
 *
 * Actions:
 *   - Restore  — removes from trash, re-queues the record for the workbench
 *   - Permanent delete — shows ConfirmDialog before destroying
 */
export function TrashRecordRow({ entry, onRestore, onPermanentDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title        = entry.record.title.trim() || "未命名实验";
  const badgeClass   = STATUS_BADGE[entry.statusAtDeletion];
  const deletedAtFmt = formatDate(entry.deletedAt);

  return (
    <>
      <div className="flex items-start gap-4 px-5 py-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-medium text-gray-900 truncate">{title}</span>
            <span
              className={[
                "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0",
                badgeClass,
              ].join(" ")}
            >
              {entry.statusAtDeletion}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            {/* SciNote */}
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {entry.sciNoteTitle}
            </span>

            {/* Deletion time */}
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {deletedAtFmt}
            </span>

            {/* Experiment code */}
            {entry.record.experimentCode && (
              <span className="font-mono">{entry.record.experimentCode}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw size={12} />
            恢复
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-100 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
            永久删除
          </button>
        </div>
      </div>

      {/* Confirm permanent deletion */}
      <ConfirmDialog
        open={confirmOpen}
        danger
        title="永久删除实验记录"
        description={`"${title}"将被永久删除，无法恢复。本体信息传承链不受影响。`}
        confirmLabel="永久删除"
        cancelLabel="取消"
        onConfirm={() => {
          setConfirmOpen(false);
          onPermanentDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
