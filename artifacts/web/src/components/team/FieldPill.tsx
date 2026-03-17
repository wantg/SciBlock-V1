/**
 * FieldPill — 可内联编辑的 key|value 属性标签
 *
 * 用于：BasicInfoCard 各字段属性展示 + 编辑
 * 复用于：任何需要 label/value pill 形式的 team 相关组件
 *
 * Layer: shared UI component
 */

import { useState, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";

export interface FieldPillProps {
  label:       string;
  value:       string;
  inputWidth?: string;
  multiline?:  boolean;
  onSave:      (v: string) => Promise<void>;
  /** When true, renders a static (non-clickable) pill with no edit affordance. */
  readonly?:   boolean;
}

export function FieldPill({
  label,
  value,
  inputWidth = "w-28",
  multiline  = false,
  onSave,
  readonly   = false,
}: FieldPillProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const [saving,  setSaving]  = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function start() { setDraft(value); setEditing(true); }

  async function confirm() {
    setSaving(true);
    try { await onSave(draft.trim()); setEditing(false); }
    finally { setSaving(false); }
  }

  function cancel() { setEditing(false); setDraft(value); }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void confirm(); }
    if (e.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <span className="inline-flex items-start gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
        <span className="text-xs text-blue-400 flex-shrink-0 mt-0.5">{label}:</span>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="text-xs bg-transparent outline-none text-blue-700 resize-none w-48"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${inputWidth} text-xs bg-transparent outline-none text-blue-700`}
          />
        )}
        <button
          onClick={() => void confirm()}
          disabled={saving}
          className="text-green-600 hover:text-green-700 flex-shrink-0 mt-0.5"
          title="确认"
        >
          <Check size={10} />
        </button>
        <button
          onClick={cancel}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
          title="取消"
        >
          <X size={10} />
        </button>
      </span>
    );
  }

  if (readonly) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-transparent rounded-full px-3 py-1">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <span className="w-px h-2.5 bg-slate-300" />
        <span className="text-[11px] text-slate-700">
          {value || <span className="text-slate-300 italic">未填写</span>}
        </span>
      </span>
    );
  }

  return (
    <span
      onClick={start}
      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 hover:border-blue-100 border border-transparent rounded-full px-3 py-1 cursor-pointer transition-all group/pill"
      title="点击编辑"
    >
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="w-px h-2.5 bg-slate-300 group-hover/pill:bg-blue-200 transition-colors" />
      <span className="text-[11px] text-slate-700">
        {value || <span className="text-slate-300 italic">未填写</span>}
      </span>
    </span>
  );
}
