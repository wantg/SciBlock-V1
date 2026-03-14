import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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

function isRecordDeletable(record: ExperimentRecord): boolean {
  return record.currentModules.every((m) => m.status !== "confirmed");
}

// ---------------------------------------------------------------------------
// PortalMenu — renders into document.body via createPortal
//
// Root cause of the original bug:
//   The RecordSwitcher has overflow-x:auto which implicitly sets overflow-y:hidden,
//   AND the outer WorkbenchLayout has overflow:hidden — two stacked clipping contexts
//   that crop any absolute-positioned child, regardless of z-index.
//
// Fix: position:fixed menu rendered via createPortal escapes both contexts entirely.
// ---------------------------------------------------------------------------

interface PortalMenuProps {
  anchorRect: DOMRect;
  record: ExperimentRecord;
  isOnlyRecord: boolean;
  onDelete: () => void;
  onClose: () => void;
}

function PortalMenu({
  anchorRect,
  record,
  isOnlyRecord,
  onDelete,
  onClose,
}: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const deletable = isRecordDeletable(record) && !isOnlyRecord;

  // Position the menu just below and aligned to the left of the anchor button
  const top  = anchorRect.bottom + 4;
  const left = anchorRect.left;

  // Close on any outside mousedown
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // slight delay so the click that opened it doesn't immediately close it
    const id = window.setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top, left, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[200px]"
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
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-300 cursor-not-allowed mb-1">
            <Trash2 size={12} />
            删除记录
          </div>
          <p className="text-[10px] text-gray-400 leading-snug">
            {isOnlyRecord
              ? "至少保留一条记录"
              : "已确认记录暂不支持删除，以避免影响本体信息传承"}
          </p>
        </div>
      )}
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// RecordTab
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
  const [menuOpen, setMenuOpen]   = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const label = record.title.trim() || RECORD_FALLBACK;
  const dot   = STATUS_DOT[record.experimentStatus];

  function handleMoreClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    // Capture the button's position for portal-based fixed positioning
    if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
    setMenuOpen(true);
  }

  function handleDeleteRequest() {
    setMenuOpen(false);
    onDelete(record);
  }

  return (
    <div className="relative flex-shrink-0">
      {/* Tab row */}
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

        {/* "..." only on the active tab */}
        {isActive && (
          <button
            ref={btnRef}
            onClick={handleMoreClick}
            title="更多操作"
            className={[
              "ml-1 p-0.5 rounded transition-colors flex-shrink-0",
              menuOpen
                ? "bg-gray-200 text-gray-700"
                : "text-gray-300 hover:text-gray-600 hover:bg-gray-100",
            ].join(" ")}
          >
            <MoreHorizontal size={12} />
          </button>
        )}
      </div>

      {/* Portal dropdown — bypasses all overflow clipping */}
      {isActive && menuOpen && anchorRect && (
        <PortalMenu
          anchorRect={anchorRect}
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
// RecordSwitcher
// ---------------------------------------------------------------------------

export function RecordSwitcher() {
  const { records, currentRecord, switchRecord, createNewRecord, deleteRecord } =
    useWorkbench();

  const [pendingDelete, setPendingDelete] = useState<ExperimentRecord | null>(null);

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteRecord(pendingDelete.id);
    setPendingDelete(null);
  }

  const isOnlyRecord = records.length === 1;

  return (
    <>
      {/*
        NOTE: overflow-x:auto clips overflow-y as well (CSS spec).
        The dropdown MUST NOT live inside this div — it uses createPortal instead.
      */}
      <div className="flex-shrink-0 flex items-center border-b border-gray-100 bg-gray-50 overflow-x-auto">
        {records.map((rec, i) => (
          <RecordTab
            key={rec.id}
            record={rec}
            index={i + 1}
            isActive={rec.id === currentRecord.id}
            isOnlyRecord={isOnlyRecord}
            onSelect={() => switchRecord(rec.id)}
            onDelete={setPendingDelete}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        title="删除实验记录"
        description={`确认删除"${pendingDelete?.title.trim() || "未命名实验"}"？删除后该记录不可恢复，本体信息传承链不受影响。`}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
