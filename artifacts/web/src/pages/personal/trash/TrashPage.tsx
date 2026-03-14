import React from "react";
import { Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTrash } from "@/contexts/TrashContext";
import { TrashRecordRow } from "./TrashRecordRow";

/**
 * TrashPage — /personal/trash
 *
 * Lists all trashed ExperimentRecord entries.
 * Users can restore or permanently delete each entry.
 *
 * This page is completely independent of WorkbenchContext —
 * all trash state lives in TrashContext (global, AuthenticatedLayout-scoped).
 */
export function TrashPage() {
  const { trashedRecords, restoreRecord, permanentlyDelete } = useTrash();

  return (
    <AppLayout title="回收站">
      {trashedRecords.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Trash2 size={22} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">回收站是空的</p>
          <p className="text-xs text-gray-400">
            移入回收站的实验记录会在这里显示，你可以随时恢复或永久删除它们
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-2.5">
          {/* Header hint */}
          <p className="text-xs text-gray-400 mb-1">
            共 {trashedRecords.length} 条记录 · 恢复后重新进入对应 SciNote 的实验记录列表
          </p>

          {trashedRecords.map((entry) => (
            <TrashRecordRow
              key={entry.record.id}
              entry={entry}
              onRestore={() => restoreRecord(entry.record.id)}
              onPermanentDelete={() => permanentlyDelete(entry.record.id)}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
