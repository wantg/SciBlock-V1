import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import type { ExperimentField, FieldType } from "@/types/experimentFields";
import { makeField } from "@/types/experimentFields";

interface Props {
  onAdd: (field: ExperimentField) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: {
  value: FieldType;
  label: string;
  desc: string;
}[] = [
  {
    value: "text",
    label: "单值文本",
    desc: "适合名称、类型、目标等单段内容",
  },
  {
    value: "list",
    label: "多项列表",
    desc: "适合步骤、注意事项等多条文本",
  },
  {
    value: "object",
    label: "对象卡片",
    desc: "适合设备、材料、样品等需要记录属性标签的类别",
  },
];

export function AddFieldForm({ onAdd, onCancel }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(makeField(trimmed, type));
    setName("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") onCancel();
  }

  const canAdd = name.trim().length > 0;

  return (
    <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50/60 px-4 py-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-600">新增字段类别</p>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400">字段名称</label>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如：实验设备、研究假设、研究对象…"
          className="text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400">内容类型</label>
        <div className="flex flex-col gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                "flex items-start gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                type === opt.value
                  ? "border-gray-900 bg-white"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <input
                type="radio"
                name="field-type"
                value={opt.value}
                checked={type === opt.value}
                onChange={() => setType(opt.value)}
                className="mt-0.5 accent-gray-900"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                <p className="text-xs text-gray-400 leading-snug mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          取消
        </button>
        <button
          disabled={!canAdd}
          onClick={handleAdd}
          className={[
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
            canAdd
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          创建
        </button>
      </div>
    </div>
  );
}
