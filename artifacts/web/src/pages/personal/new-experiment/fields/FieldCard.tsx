import React, { useState } from "react";
import { Trash2, Pencil, Check, X, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { ExperimentField } from "@/types/experimentFields";
import { ObjectField } from "./ObjectField";

interface Props {
  field: ExperimentField;
  onChange: (updated: ExperimentField) => void;
  onDelete: () => void;
}

// ---------------------------------------------------------------------------
// List item sub-component (for type === "list")
// ---------------------------------------------------------------------------

interface ListItemRowProps {
  text: string;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function ListItemRow({
  text,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onDelete,
}: ListItemRowProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirmEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
          className="flex-1 h-7 text-sm"
        />
        <button onClick={onConfirmEdit} className="text-green-600 hover:text-green-700 p-0.5 rounded cursor-pointer" title="保存">
          <Check size={14} />
        </button>
        <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer" title="取消">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-px" />
      <span className="flex-1 text-sm text-gray-700 leading-snug">{text}</span>
      <button
        onClick={onStartEdit}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-0.5 rounded transition-opacity"
        title="编辑"
      >
        <Pencil size={12} />
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5 rounded transition-opacity"
        title="删除"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldCard — top-level card for a single field category
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  text: "单值文本",
  list: "多项列表",
  object: "对象卡片",
};

export function FieldCard({ field, onChange, onDelete }: Props) {
  // List field state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [addingText, setAddingText] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  // ------ list helpers ------

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditingValue(field.items[index]);
  }

  function confirmEdit() {
    if (editingIndex === null) return;
    const trimmed = editingValue.trim();
    if (!trimmed) return cancelEdit();
    const items = field.items.map((item, i) => (i === editingIndex ? trimmed : item));
    onChange({ ...field, items });
    setEditingIndex(null);
    setEditingValue("");
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingValue("");
  }

  function deleteListItem(index: number) {
    onChange({ ...field, items: field.items.filter((_, i) => i !== index) });
    if (editingIndex === index) cancelEdit();
  }

  function confirmAdd() {
    const trimmed = addingText.trim();
    if (!trimmed) return;
    onChange({ ...field, items: [...field.items, trimmed] });
    setAddingText("");
    setShowAddInput(false);
  }

  // ------ render body ------

  function renderBody() {
    switch (field.type) {
      case "text":
        return (
          <Textarea
            rows={3}
            className="resize-none text-sm"
            placeholder={`填写 ${field.name}…`}
            value={field.value}
            onChange={(e) => onChange({ ...field, value: e.target.value })}
          />
        );

      case "list":
        return (
          <div className="flex flex-col gap-1">
            {field.items.length === 0 && !showAddInput && (
              <p className="text-xs text-gray-300 py-1">暂无内容，点击下方按钮添加</p>
            )}
            {field.items.map((item, i) => (
              <ListItemRow
                key={`${field.id}-item-${i}`}
                text={item}
                isEditing={editingIndex === i}
                editValue={editingValue}
                onEditValueChange={setEditingValue}
                onStartEdit={() => startEdit(i)}
                onConfirmEdit={confirmEdit}
                onCancelEdit={cancelEdit}
                onDelete={() => deleteListItem(i)}
              />
            ))}
            {showAddInput ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  autoFocus
                  value={addingText}
                  onChange={(e) => setAddingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmAdd();
                    if (e.key === "Escape") { setAddingText(""); setShowAddInput(false); }
                  }}
                  placeholder="输入新一项内容…"
                  className="flex-1 h-7 text-sm"
                />
                <button onClick={confirmAdd} className="text-green-600 hover:text-green-700 p-0.5 cursor-pointer" title="确认">
                  <Check size={14} />
                </button>
                <button
                  onClick={() => { setAddingText(""); setShowAddInput(false); }}
                  className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  title="取消"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddInput(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors mt-1 py-0.5"
              >
                <Plus size={11} />
                新增一项
              </button>
            )}
          </div>
        );

      case "object":
        return (
          <ObjectField
            objects={field.objects}
            onChange={(objects) => onChange({ ...field, objects })}
          />
        );

      default:
        return null;
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <span className="text-sm font-medium text-gray-700">{field.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-300 mr-2">{TYPE_LABELS[field.type] ?? field.type}</span>
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
            title="删除该字段类别"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3">{renderBody()}</div>
    </div>
  );
}
