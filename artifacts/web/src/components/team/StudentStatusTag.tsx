/**
 * StudentStatusTag — 学生状态可交互标签
 *
 * 展示：在读 / 已毕业 / 待确认 彩色标签
 * 交互：单击弹出选择框，选择后调用 onSave 并同步后端
 *
 * Layer: shared UI component (可在 MemberCard、ProfileCard 等处复用)
 */

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { StudentStatus } from "../../types/team";
import { STATUS_LABELS, STATUS_COLORS } from "../../types/team";

// 可选择的状态（在读 / 已毕业）
const SELECTABLE: StudentStatus[] = ["active", "graduated"];

export interface StudentStatusTagProps {
  status:       StudentStatus;
  onSave:       (s: StudentStatus) => Promise<void>;
  /** 阻止父级点击（卡片跳转等），默认 true */
  stopPropagation?: boolean;
  /** 紧凑模式：不显示下箭头 */
  compact?: boolean;
  /** 只读模式：仅展示，不允许点击切换状态 */
  readonly?: boolean;
}

export function StudentStatusTag({
  status,
  onSave,
  stopPropagation = true,
  compact         = false,
  readonly        = false,
}: StudentStatusTagProps) {
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function select(next: StudentStatus) {
    if (next === status) { setOpen(false); return; }
    setSaving(true);
    try {
      await onSave(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function toggle(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    if (!saving) setOpen(o => !o);
  }

  const sc = STATUS_COLORS[status] ?? STATUS_COLORS.active;

  if (readonly) {
    return (
      <span
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-full
          text-xs font-medium select-none
          ${sc.bg} ${sc.text} ring-1 ${sc.ring}
        `}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        {STATUS_LABELS[status]}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger badge */}
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-full
          text-xs font-medium select-none transition-all
          ${sc.bg} ${sc.text}
          ring-1 ${sc.ring}
          hover:brightness-95 active:scale-95
          disabled:opacity-60 disabled:cursor-wait
        `}
        title="点击切换状态"
        aria-label={`状态：${STATUS_LABELS[status]}，点击修改`}
      >
        {saving ? (
          <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        )}
        {STATUS_LABELS[status]}
        {!compact && <ChevronDown size={10} className="opacity-50" />}
      </button>

      {/* Dropdown popover */}
      {open && (
        <div
          className="absolute z-50 top-full mt-1.5 left-0 min-w-[100px]
                     bg-white border border-gray-200 rounded-lg shadow-lg
                     py-1 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <p className="px-3 py-1 text-[10px] text-gray-400 font-medium border-b border-gray-100 mb-1">
            切换状态
          </p>
          {SELECTABLE.map(s => {
            const c = STATUS_COLORS[s];
            const isActive = s === status;
            return (
              <button
                key={s}
                type="button"
                onClick={() => void select(s)}
                className={`
                  w-full flex items-center justify-between gap-2 px-3 py-1.5
                  text-xs text-left transition-colors
                  ${isActive
                    ? `${c.bg} ${c.text} font-semibold`
                    : "text-gray-600 hover:bg-gray-50"
                  }
                `}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${c.bg.replace("100", "500")}`} />
                  {STATUS_LABELS[s]}
                </span>
                {isActive && <Check size={11} className="opacity-70" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
