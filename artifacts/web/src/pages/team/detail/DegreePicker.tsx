/**
 * DegreePicker — 内联学位选择器
 *
 * 点击学位标签后弹出，提供按钮组选择硕士/博士/联培/本科
 *
 * Layer: detail sub-component
 */

import { useState } from "react";
import type { StudentDegree } from "../../../types/team";
import { DEGREE_OPTIONS } from "../../../types/team";

export interface DegreePickerProps {
  value:    StudentDegree;
  onSave:   (v: StudentDegree) => Promise<void>;
  onCancel: () => void;
}

export function DegreePicker({ value, onSave, onCancel }: DegreePickerProps) {
  const [draft,  setDraft]  = useState<StudentDegree>(value);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    try { await onSave(draft); }
    finally { setSaving(false); }
  }

  return (
    <span className="inline-flex flex-col gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
      <span className="text-[10px] text-blue-400">选择学位</span>
      <div className="flex gap-1 flex-wrap">
        {DEGREE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDraft(opt.value)}
            className={`text-[10px] font-medium border rounded px-1.5 py-0.5 leading-none transition-colors ${
              draft === opt.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => void confirm()}
          disabled={saving}
          className="text-[10px] text-green-700 font-medium hover:underline"
        >
          确认
        </button>
        <span className="text-gray-300 text-[10px]">·</span>
        <button onClick={onCancel} className="text-[10px] text-gray-400 hover:underline cursor-pointer">
          取消
        </button>
      </div>
    </span>
  );
}
