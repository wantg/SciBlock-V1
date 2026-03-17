import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTrash } from "@/contexts/TrashContext";
import { useSciNoteStore } from "@/contexts/SciNoteStoreContext";
import { useToast } from "@/hooks/use-toast";
import { listExperiments, restoreExperiment } from "@/api/experiments";
import type { DeletedRecord } from "@/types/trash";
import { TrashRecordRow } from "./TrashRecordRow";

/**
 * TrashPage — /personal/trash
 *
 * Lists all soft-deleted ExperimentRecord entries by querying the Go API
 * (GET /api/scinotes/:id/experiments?deleted=true) for each SciNote.
 *
 * Restore: PATCH /api/experiments/:id/restore (API) + TrashContext update
 *          for within-session workbench sync.
 * Permanent delete: local-only removal from the displayed list
 *                   (server hard-delete endpoint not yet implemented).
 */
export function TrashPage() {
  const { notes } = useSciNoteStore();
  const trash = useTrash();
  const { toast } = useToast();

  const [items, setItems] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Load deleted experiments from API for every SciNote
  // ---------------------------------------------------------------------------

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const perNote = await Promise.all(
        notes.map((note) =>
          listExperiments(note.id, { deletedOnly: true })
            .then((res) =>
              res.items.map((record): DeletedRecord => ({
                record,
                sciNoteId: note.id,
                sciNoteTitle: note.title,
                deletedAt: record.updatedAt ?? record.createdAt,
                statusAtDeletion: record.experimentStatus,
              })),
            )
            .catch(() => [] as DeletedRecord[]),
        ),
      );
      const all = perNote
        .flat()
        .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      setItems(all);
    } finally {
      setLoading(false);
    }
  }, [notes]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function handleRestore(entry: DeletedRecord) {
    try {
      await restoreExperiment(entry.record.id);
      setItems((prev) => prev.filter((i) => i.record.id !== entry.record.id));
      // Also update in-memory TrashContext so the workbench syncs if already mounted
      trash.restoreRecord(entry.record.id);
      toast({
        title: "已恢复",
        description: `"${entry.record.title.trim() || "未命名实验"}" 已恢复到对应实验本`,
      });
    } catch {
      toast({
        title: "恢复失败",
        description: "无法连接服务器，请稍后重试",
        variant: "destructive",
      });
    }
  }

  function handlePermanentDelete(recordId: string) {
    setItems((prev) => prev.filter((i) => i.record.id !== recordId));
    trash.permanentlyDelete(recordId);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppLayout title="回收站">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
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
          <p className="text-xs text-gray-400 mb-1">
            共 {items.length} 条记录 · 恢复后重新进入对应 SciNote 的实验记录列表
          </p>
          {items.map((entry) => (
            <TrashRecordRow
              key={entry.record.id}
              entry={entry}
              onRestore={() => handleRestore(entry)}
              onPermanentDelete={() => handlePermanentDelete(entry.record.id)}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
