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

/**
 * Why this record cannot be deleted, or null if deletion is allowed.
 *
 * Rules (must match backend SoftDelete guards exactly):
 *  1. confirmed / confirmed_dirty → "confirmed"
 *  2. draft but referenced by a downstream record → "referenced"
 *  3. otherwise → null (deletable)
 *
 * The "at least one record must remain" front-end guard has been removed.
 * When all records are deleted the workbench shows an empty state.
 */
type DeleteBlockReason = "confirmed" | "referenced" | null;

function getDeleteBlockReason(
  record: ExperimentRecord,
  allRecords: ExperimentRecord[],
): DeleteBlockReason {
  if (
    record.confirmationState === "confirmed" ||
    record.confirmationState === "confirmed_dirty"
  ) {
    return "confirmed";
  }
  const isReferenced = allRecords.some(
    (r) => r.id !== record.id && r.derivedFromRecordId === record.id,
  );
  return isReferenced ? "referenced" : null;
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
  blockReason: DeleteBlockReason;
  onDelete: () => void;
  onClose: () => void;
}

function PortalMenu({
  anchorRect,
  blockReason,
  onDelete,
  onClose,
}: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const deletable = blockReason === null;

  const top  = anchorRect.bottom + 4;
  const left = anchorRect.left;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const id = window.setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [onClose]);

  const disabledText =
    blockReason === "referenced"
      ? "该记录已被后续记录引用，无法删除"
      : "已确认记录暂不支持删除，以避免影响传承链";

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
          移入回收站
        </button>
      ) : (
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-300 cursor-not-allowed mb-1">
            <Trash2 size={12} />
            删除记录
          </div>
          <p className="text-[10px] text-gray-400 leading-snug">
            {disabledText}
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
  allRecords: ExperimentRecord[];
  isActive: boolean;
  onSelect: () => void;
  onDelete: (record: ExperimentRecord) => void;
}

function RecordTab({
  record,
  allRecords,
  isActive,
  onSelect,
  onDelete,
}: RecordTabProps) {
  const displaySeq = record.sequenceNumber;
  const [menuOpen, setMenuOpen]     = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const label      = record.title.trim() || RECORD_FALLBACK;
  const dot        = STATUS_DOT[record.experimentStatus];
  const blockReason = getDeleteBlockReason(record, allRecords);

  function handleMoreClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
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
        <span className="text-gray-300 font-mono">{String(displaySeq).padStart(2, "0")}</span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="truncate max-w-[120px]">{label}</span>
        {record.confirmationState === "confirmed_dirty" && (
          <span
            title="内容已修改，需重新确认"
            className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400"
          />
        )}

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

      {isActive && menuOpen && anchorRect && (
        <PortalMenu
          anchorRect={anchorRect}
          blockReason={blockReason}
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
  const { records, currentRecord, switchRecord, createNewRecord, moveToTrash } =
    useWorkbench();

  const [pendingTrash, setPendingTrash] = useState<ExperimentRecord | null>(null);

  function handleConfirmTrash() {
    if (!pendingTrash) return;
    moveToTrash(pendingTrash.id);
    setPendingTrash(null);
  }

  return (
    <>
      {/*
        NOTE: overflow-x:auto clips overflow-y (CSS spec).
        The dropdown uses createPortal to escape both overflow contexts.
      */}
      <div className="flex-shrink-0 flex items-center border-b border-gray-100 bg-gray-50 overflow-x-auto">
        {records.map((rec) => (
          <RecordTab
            key={rec.id}
            record={rec}
            allRecords={records}
            isActive={rec.id === currentRecord?.id}
            onSelect={() => switchRecord(rec.id)}
            onDelete={setPendingTrash}
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
        open={pendingTrash !== null}
        danger
        title="移入回收站"
        description={`"${pendingTrash?.title.trim() || "未命名实验"}"将被移入回收站。你可以在回收站中恢复或永久删除它，本体信息传承链不受影响。`}
        confirmLabel="移入回收站"
        cancelLabel="取消"
        onConfirm={handleConfirmTrash}
        onCancel={() => setPendingTrash(null)}
      />
    </>
  );
}
