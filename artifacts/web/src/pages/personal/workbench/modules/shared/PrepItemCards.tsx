/**
 * PrepItemCards — shared view and edit cards for PrepItem.
 *
 * Used by:
 *   workbench/modules/PreparationModuleEditor  (showAttachments=true, default)
 *   new-experiment/fields/Step3PrepEditor       (showAttachments=false)
 *
 * UI labels: "分类" for category; "备注" for description. Badge color comes
 * from PREP_CATEGORY.colors; unmapped values fall back to neutral gray.
 */

import React from "react";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PrepItem } from "@/types/ontologyModules";
import { PREP_CATEGORY } from "@/config/ontologyOptions";
import { ItemField } from "./ItemField";
import { AttachmentArea } from "./AttachmentArea";
import { AttachmentViewStrip } from "./AttachmentViewStrip";
import { AttributeTagRow } from "./AttributeTagRow";
import { OntologyPicker } from "./OntologyPicker";

// ---------------------------------------------------------------------------
// PrepItemEditCard
// ---------------------------------------------------------------------------

interface EditCardProps {
  draft: PrepItem;
  onChange: (updated: PrepItem) => void;
  onSave: () => void;
  onCancel: () => void;
  showAttachments?: boolean;
}

export function PrepItemEditCard({
  draft,
  onChange,
  onSave,
  onCancel,
  showAttachments = true,
}: EditCardProps) {
  function set<K extends keyof PrepItem>(key: K, value: PrepItem[K]) {
    onChange({ ...draft, [key]: value });
  }

  const canSave = draft.name.trim().length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <span className="text-sm font-medium text-gray-700 truncate">
          {draft.name.trim() || "新准备项"}
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

      <div className="px-4 py-3 flex flex-col gap-3">
        <ItemField label="名称" required>
          <Input
            autoFocus
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSave) onSave();
            }}
            placeholder="如：丙酮超声清洗、ZnO 靶材预溅射"
            className="h-8 text-sm"
          />
        </ItemField>

        <ItemField label="分类">
          <OntologyPicker
            value={draft.category}
            options={PREP_CATEGORY.options}
            onChange={(v) => set("category", v)}
          />
        </ItemField>

        <ItemField label="属性参数" hint="点击标签修改；回车确认">
          <AttributeTagRow
            tags={draft.attributes}
            onChange={(tags) => set("attributes", tags)}
            keyPlaceholder="参数名"
            valuePlaceholder="值"
          />
        </ItemField>

        <ItemField label="备注">
          <Textarea
            value={draft.description ?? ""}
            onChange={(e) => set("description", e.target.value || undefined)}
            placeholder="注意事项、替代方案或补充说明…"
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
// PrepItemViewCard
// ---------------------------------------------------------------------------

interface ViewCardProps {
  item: PrepItem;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updated: PrepItem) => void;
  showAttachments?: boolean;
}

export function PrepItemViewCard({
  item,
  onEdit,
  onDelete,
  onUpdate,
  showAttachments = true,
}: ViewCardProps) {
  const catColor =
    PREP_CATEGORY.colors[item.category] ?? "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm group">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onEdit}
          className={[
            "flex-shrink-0 text-[10px] font-medium border rounded px-1.5 py-0.5 leading-none whitespace-nowrap hover:opacity-70 transition-opacity",
            catColor,
          ].join(" ")}
          title="点击编辑"
        >
          {item.category}
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="flex-1 text-sm font-medium text-gray-800 text-left hover:text-blue-700 transition-colors leading-snug min-w-0 truncate"
          title="点击编辑"
        >
          {item.name || (
            <span className="text-gray-300 font-normal italic">未命名准备项</span>
          )}
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

      <div className="px-3 pb-2">
        <AttributeTagRow
          tags={item.attributes}
          onChange={(tags) => onUpdate({ ...item, attributes: tags })}
          keyPlaceholder="参数名"
          valuePlaceholder="值"
        />
      </div>

      {item.description && (
        <button
          type="button"
          onClick={onEdit}
          className="px-3 pb-2.5 text-xs text-gray-500 leading-relaxed text-left hover:text-gray-700 transition-colors w-full"
        >
          {item.description}
        </button>
      )}

      {showAttachments && (
        <div className="px-3 pb-2">
          <AttachmentViewStrip attachments={item.attachments ?? []} />
        </div>
      )}
    </div>
  );
}
