/**
 * AttachmentStatusBadge — status label + dropdown selector for attachments.
 *
 * Layer: Shared UI component (no storage imports, no context).
 *
 * Two modes:
 *
 *   View mode  (onChange = undefined)
 *     Displays the status as a read-only colored badge.
 *     Renders nothing when status is undefined.
 *
 *   Edit mode  (onChange provided)
 *     Shows a trigger button (colored badge when labelled, "未评定" when not).
 *     Clicking opens a custom dropdown with two grouped sections:
 *       质量评估 — 合格 / 不合格 / 待确认
 *       状态评估 — 完成 / 待确认 / 异常
 *     Selecting an option calls onChange and closes the menu.
 *     A "清除标签" footer option resets status to undefined.
 *     Clicking outside closes the dropdown.
 *
 * Color mapping:
 *   合格   → green    不合格 → red     待确认 → yellow
 *   完成   → blue     异常   → orange
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { AttachmentStatus } from "@/types/ontologyModules";
import {
  ATTACHMENT_STATUS_CONFIG,
  ATTACHMENT_STATUS_GROUPS,
} from "@/data/attachmentUtils";

interface Props {
  status?: AttachmentStatus;
  /** Provide to enable the dropdown selector (edit mode). Omit for read-only. */
  onChange?: (next: AttachmentStatus | undefined) => void;
}

// ---------------------------------------------------------------------------
// Shared badge renderer (used in both modes)
// ---------------------------------------------------------------------------

function StatusBadgeInner({ status }: { status: AttachmentStatus }) {
  const cfg = ATTACHMENT_STATUS_CONFIG[status];
  return (
    <>
      <span className={["w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dotCls].join(" ")} />
      {cfg.label}
    </>
  );
}

// ---------------------------------------------------------------------------
// AttachmentStatusBadge
// ---------------------------------------------------------------------------

export function AttachmentStatusBadge({ status, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when the user clicks outside the container
  useEffect(() => {
    if (!open) return;
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [open]);

  // ── View mode ────────────────────────────────────────────────────────────
  if (!onChange) {
    if (!status) return null;
    const cfg = ATTACHMENT_STATUS_CONFIG[status];
    return (
      <span
        className={[
          "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none flex-shrink-0",
          cfg.badgeCls,
        ].join(" ")}
      >
        <StatusBadgeInner status={status} />
      </span>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  const cfg = status ? ATTACHMENT_STATUS_CONFIG[status] : null;

  function handleSelect(e: React.MouseEvent, value: AttachmentStatus) {
    e.stopPropagation();
    onChange(value);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(undefined);
    setOpen(false);
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen((v) => !v);
  }

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={handleToggle}
        className={[
          "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none transition-opacity hover:opacity-80",
          cfg
            ? cfg.badgeCls
            : "bg-gray-100 text-gray-400 border border-gray-200 hover:border-gray-300",
        ].join(" ")}
        title="点击选择附件状态标签"
      >
        {cfg ? (
          <StatusBadgeInner status={status!} />
        ) : (
          <span className="text-gray-400">未评定</span>
        )}
        <ChevronDown
          size={8}
          className={["ml-0.5 transition-transform", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-28"
          onClick={(e) => e.stopPropagation()}
        >
          {ATTACHMENT_STATUS_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {/* Group divider (except first) */}
              {gi > 0 && <div className="border-t border-gray-100 my-1" />}

              {/* Group heading */}
              <div className="px-2.5 pt-0.5 pb-0.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-none">
                {group.label}
              </div>

              {/* Options */}
              {group.options.map((opt) => {
                const c = ATTACHMENT_STATUS_CONFIG[opt];
                const isActive = status === opt;
                return (
                  <button
                    key={`${group.label}-${opt}`}
                    type="button"
                    onClick={(e) => handleSelect(e, opt)}
                    className={[
                      "w-full text-left px-2.5 py-1 text-[11px] flex items-center gap-1.5 transition-colors",
                      isActive
                        ? "bg-gray-50 font-semibold text-gray-700"
                        : "text-gray-600 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <span className={["w-2 h-2 rounded-full flex-shrink-0", c.dotCls].join(" ")} />
                    {c.label}
                    {isActive && (
                      <span className="ml-auto text-gray-400 text-[9px]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* ── Clear option (only when a status is set) ── */}
          {status && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                onClick={handleClear}
                className="w-full text-left px-2.5 py-1 text-[11px] text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                清除标签
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
