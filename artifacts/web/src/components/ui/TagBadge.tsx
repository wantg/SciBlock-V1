import React, { useState, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";
import type { Tag } from "@/types/experimentFields";

interface Props {
  tag: Tag;
  onUpdate: (updated: Tag) => void;
  onDelete: () => void;
}

/**
 * TagBadge — a single attribute tag pill.
 *
 * Normal state: displays "key: value" (or just "key" when value is empty).
 *   - Clicking the text area opens inline editing.
 *   - The × button deletes the tag.
 *
 * Editing state: two compact inputs [key] [value] with confirm/cancel.
 */
export function TagBadge({ tag, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(tag.key);
  const [editValue, setEditValue] = useState(tag.value);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) keyRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setEditKey(tag.key);
    setEditValue(tag.value);
    setEditing(true);
  }

  function confirm() {
    const trimmedKey = editKey.trim();
    if (!trimmedKey) return cancel();
    onUpdate({ ...tag, key: trimmedKey, value: editValue.trim() });
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setEditKey(tag.key);
    setEditValue(tag.value);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">
        <input
          ref={keyRef}
          value={editKey}
          onChange={(e) => setEditKey(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="标签类型"
          className="w-16 text-xs bg-transparent outline-none text-blue-700 placeholder:text-blue-300"
        />
        <span className="text-blue-300 text-xs">:</span>
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="值"
          className="w-16 text-xs bg-transparent outline-none text-blue-700 placeholder:text-blue-300"
        />
        <button
          onClick={confirm}
          className="text-green-600 hover:text-green-700 flex-shrink-0 cursor-pointer"
          title="确认"
        >
          <Check size={10} />
        </button>
        <button
          onClick={cancel}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer"
          title="取消"
        >
          <X size={10} />
        </button>
      </span>
    );
  }

  const label = tag.value ? `${tag.key}: ${tag.value}` : tag.key;

  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-150 rounded-full px-2.5 py-0.5 group transition-colors">
      <button
        onClick={startEdit}
        className="text-xs text-slate-600 hover:text-slate-800 leading-none cursor-pointer"
        title="编辑标签"
      >
        {label}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity leading-none cursor-pointer"
        title="删除标签"
      >
        <X size={10} />
      </button>
    </span>
  );
}
