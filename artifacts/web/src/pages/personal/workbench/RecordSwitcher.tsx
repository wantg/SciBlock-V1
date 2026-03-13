import React, { useState, useEffect, useRef } from "react";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ExperimentRecord, ExperimentStatus } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RECORD_FALLBACK = "未命名实验";

const STATUS_DOT: Record<ExperimentStatus, string> = {
  探索中: "bg-blue-400",
  可复现: "bg-emerald-400",
  失败:   "bg-red-400",
  已验证: "bg-violet-400",
};

/**
 * A record is "未确认" (deletable) when NONE of its modules are confirmed.
 * Once any module is confirmed, the record is protected to preserve the
 * ontology inheritance chain.
 */
function isRecordDeletable(record: ExperimentRecord): boolean {
  return record.currentModules.every((m) => m.status !== "confirmed");
}

// ---------------------------------------------------------------------------
// RecordMenu — the "..." dropdown anchored to each active tab
// ---------------------------------------------------------------------------

interface RecordMenuProps {
  record: ExperimentRecord;
  isOnlyRecord: boolean;
  onDelete: () => void;
  onClose: () => void;
}

function RecordMenu({ record, isOnlyRecord, onDelete, onClose }: RecordMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const deletable = isRecordDeletable(record) && !isOnlyRecord;

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {deletable ? (
        <button
          onClick={onDelete}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
        >
          <Trash2 size={12} />
          删除记录
        </button>
      ) : (
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-gray-300 cursor-not-allowed mb-0.5">
            <Trash2 size={12} />
            删除记录
          </div>
          <p className="text-[10px] text-gray-300 leading-tight">
            {isOnlyRecord
              ? "至少保留一条记录"
              : "已确认记录暂不支持删除，以避免影响本体信息传承"}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordTab — single tab with optional "..." menu trigger
// ---------------------------------------------------------------------------

interface RecordTabProps {
  record: ExperimentRecord;
  index: number;
  isActive: boolean;
  isOnlyRecord: boolean;
  onSelect: () => void;
  onDelete: (record: ExperimentRecord) => void;
}

function RecordTab({
  record,
  index,
  isActive,
  isOnlyRecord,
  onSelect,
  onDelete,
}: RecordTabProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const label = record.title.trim() || RECORD_FALLBACK;
  const dot   = STATUS_DOT[record.experimentStatus];

  function handleMoreClick(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  }

  function handleDeleteRequest() {
    setMenuOpen(false);
    onDelete(record);
  }

  return (
    <div className="relative flex-shrink-0">
      <div
        className={[
          "flex items-center gap-1.5 pl-3 pr-1.5 py-2 text-xs whitespace-nowrap",
          "border-b-2 transition-colors cursor-pointer select-none",
          isActive
            ? "border-gray-900 text-gray-900 font-medium bg-white"
            : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 bg-transparent",
        ].join(" ")}
        onClick={onSelect}
        title={label}
      >
        <span className="text-gray-300 font-mono">{String(index).padStart(2, "0")}</span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="truncate max-w-[120px]">{label}</span>

        {/* "..." only visible on the active tab */}
        {isActive && (
          <button
            onClick={handleMoreClick}
            title="更多操作"
            className="ml-1 p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <MoreHorizontal size={12} />
          </button>
        )}
      </div>

      {/* Dropdown menu */}
      {isActive && menuOpen && (
        <RecordMenu
          record={record}
          isOnlyRecord={isOnlyRecord}
          onDelete={handleDeleteRequest}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordSwitcher — the full tab bar
// ---------------------------------------------------------------------------

/**
 * RecordSwitcher — horizontal tab bar above the three-panel layout.
 *
 * - Shows all experiment records as tabs.
 * - Active tab has a dark underline + "..." more-options button.
 * - "..." menu exposes "删除记录":
 *     • Enabled  when ALL modules are still inherited (未确认)
 *     • Disabled when any module is confirmed OR only 1 record remains
 * - Confirmation dialog (ConfirmDialog) gates the actual deletion.
 * - "+ 新建" button on the right end creates a new record.
 */
export function RecordSwitcher() {
  const { records, currentRecord, switchRecord, createNewRecord, deleteRecord } =
    useWorkbench();

  // Pending-delete state drives the ConfirmDialog
  const [pendingDelete, setPendingDelete] = useState<ExperimentRecord | null>(null);

  function handleDeleteRequest(record: ExperimentRecord) {
    setPendingDelete(record);
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteRecord(pendingDelete.id);
    setPendingDelete(null);
  }

  function handleCancelDelete() {
    setPendingDelete(null);
  }

  const isOnlyRecord = records.length === 1;

  return (
    <>
      <div className="flex-shrink-0 flex items-center border-b border-gray-100 bg-gray-50 overflow-x-auto">
        {records.map((rec, i) => (
          <RecordTab
            key={rec.id}
            record={rec}
            index={i + 1}
            isActive={rec.id === currentRecord.id}
            isOnlyRecord={isOnlyRecord}
            onSelect={() => switchRecord(rec.id)}
            onDelete={handleDeleteRequest}
          />
        ))}

        <button
          onClick={createNewRecord}
          title="新建实验记录"
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0 border-b-2 border-transparent"
        >
          <Plus size={12} />
          新建
        </button>
      </div>

      {/* Deletion confirmation dialog */}
      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        title="删除实验记录"
        description={`确认删除"${pendingDelete?.title.trim() || "未命名实验"}"？删除后该记录不可恢复，本体信息传承链不受影响。`}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
