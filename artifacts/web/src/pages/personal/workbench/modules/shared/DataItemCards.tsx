/**
 * DataItemCards — shared edit/view card pair for the DataItem model.
 *
 * Used by:
 *   - DataModuleEditor (workbench, showAttachments=true)
 *   - Step6DataEditor (wizard, showAttachments=false)
 *
 * UI labels use "备注" / "说明" — never "description".
 */

import React from "react";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { AttachmentViewStrip } from "./AttachmentViewStrip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DataItem } from "@/types/ontologyModules";
import { ItemField } from "./ItemField";
import { AttachmentArea } from "./AttachmentArea";
import { AttributeTagRow } from "./AttributeTagRow";

// ---------------------------------------------------------------------------
// DataItemEditCard
// ---------------------------------------------------------------------------

export interface DataItemEditCardProps {
  draft: DataItem;
  onChange: (updated: DataItem) => void;
  onSave: () => void;
  onCancel: () => void;
  /** Whether to show the attachment section. False in wizard, true in workbench. */
  showAttachments?: boolean;
}

export function DataItemEditCard({
  draft,
  onChange,
  onSave,
  onCancel,
  showAttachments = true,
}: DataItemEditCardProps) {
  function set<K extends keyof DataItem>(key: K, value: DataItem[K]) {
    onChange({ ...draft, [key]: value });
  }

  const canSave = draft.name.trim().length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <span className="text-sm font-medium text-gray-700 truncate">
          {draft.name.trim() || "新数据项"}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-1.5 py-1 rounded"
          >
            <X size={12} /> 取消
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="flex items-center gap-0.5 text-xs bg-gray-900 text-white px-2.5 py-1 rounded hover:bg-gray-700 disabled:opacity-40 transition-colors font-medium"
          >
            <Check size={12} /> 保存
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-3">
        <ItemField label="数据名称" required>
          <Input
            autoFocus
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canSave) onSave(); }}
            placeholder="如：吸光度、薄膜厚度、载流子浓度"
            className="h-8 text-sm"
          />
        </ItemField>

        <ItemField label="属性" hint="点击标签修改；回车确认">
          <AttributeTagRow
            tags={draft.attributes}
            onChange={(tags) => set("attributes", tags)}
            keyPlaceholder="属性名"
            valuePlaceholder="值"
            addLabel="属性"
          />
        </ItemField>

        <ItemField label="备注 / 说明">
          <Textarea
            value={draft.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="数据来源、处理方法或补充说明…"
            rows={2}
            className="resize-none text-sm"
          />
        </ItemField>

        {showAttachments && (
          <AttachmentArea
            attachments={draft.attachments ?? []}
            onChange={(attachments) => set("attachments", attachments)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataItemViewCard
// ---------------------------------------------------------------------------

export interface DataItemViewCardProps {
  item: DataItem;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updated: DataItem) => void;
}

export function DataItemViewCard({
  item,
  onEdit,
  onDelete,
  onUpdate,
}: DataItemViewCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm group">
      {/* Header row: name + actions */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 text-sm font-medium text-gray-800 text-left hover:text-blue-700 transition-colors leading-snug min-w-0 truncate"
          title="点击编辑"
        >
          {item.name || <span className="text-gray-300 font-normal italic">未命名数据项</span>}
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
            title="编辑"
          >
            <Pencil size={11} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Attributes — direct inline key:value edit without entering full edit mode */}
      <div className="px-3 pb-2">
        <AttributeTagRow
          tags={item.attributes}
          onChange={(tags) => onUpdate({ ...item, attributes: tags })}
          keyPlaceholder="属性名"
          valuePlaceholder="值"
          addLabel="属性"
        />
      </div>

      {/* 备注/说明 — shown in view mode when present */}
      {item.description && (
        <button
          type="button"
          onClick={onEdit}
          className="px-3 pb-2.5 text-xs text-gray-500 leading-relaxed text-left hover:text-gray-700 transition-colors w-full"
        >
          {item.description}
        </button>
      )}

      <div className="px-3 pb-2">
        <AttachmentViewStrip attachments={item.attachments ?? []} />
      </div>
    </div>
  );
}
