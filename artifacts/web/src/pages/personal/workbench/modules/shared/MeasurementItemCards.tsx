/**
 * MeasurementItemCards — shared view/edit card components for MeasurementItem.
 *
 * Imported by:
 *   - MeasurementModuleEditor (workbench panel, full feature set)
 *   - Step5MeasurementEditor  (wizard step, no attachments)
 *
 * The single `showAttachments` prop on MeasurementItemEditCard controls
 * whether the AttachmentArea is rendered.  Default is true (workbench).
 * Wizard sets showAttachments={false}.
 */

import React from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MeasurementItem } from "@/types/ontologyModules";
import { ItemField } from "./ItemField";
import { AttachmentArea } from "./AttachmentArea";
import { AttachmentViewStrip } from "./AttachmentViewStrip";
import { AttributeTagRow } from "./AttributeTagRow";

// ---------------------------------------------------------------------------
// MeasurementItemEditCard
// ---------------------------------------------------------------------------

export interface MeasurementItemEditCardProps {
  draft: MeasurementItem;
  onChange: (updated: MeasurementItem) => void;
  onSave: () => void;
  onCancel: () => void;
  /** Whether to render the AttachmentArea. Defaults to true. Set false in wizard. */
  showAttachments?: boolean;
}

export function MeasurementItemEditCard({
  draft,
  onChange,
  onSave,
  onCancel,
  showAttachments = true,
}: MeasurementItemEditCardProps) {
  function set<K extends keyof MeasurementItem>(key: K, val: MeasurementItem[K]) {
    onChange({ ...draft, [key]: val });
  }

  const canSave = draft.name.trim().length > 0;
  const targetEmpty = !draft.target?.trim();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <span className="text-sm font-medium text-gray-700 truncate">
          {draft.name.trim() || "新测量项"}
          {draft.instrument && (
            <span className="ml-2 text-[11px] font-normal text-gray-400">{draft.instrument}</span>
          )}
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
        {/* 测量项名称 — required */}
        <ItemField label="测量项名称" required>
          <Input
            autoFocus
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canSave) onSave(); }}
            placeholder="如：XRD 衍射表征"
            className="h-8 text-sm"
          />
        </ItemField>

        {/* 仪器 / 设备 */}
        <ItemField label="仪器 / 设备">
          <Input
            value={draft.instrument ?? ""}
            onChange={(e) => set("instrument", e.target.value || undefined)}
            placeholder="如：Rigaku SmartLab"
            className="h-8 text-sm"
          />
        </ItemField>

        {/* 测量方法 */}
        <ItemField label="测量方法" hint="如：θ-2θ 扫描、掠入射 XRD…">
          <Input
            value={draft.method ?? ""}
            onChange={(e) => set("method", e.target.value || undefined)}
            placeholder="如：Cu Kα 辐射，θ-2θ 扫描"
            className="h-8 text-sm"
          />
        </ItemField>

        {/* 测量目标 — soft validation: empty hint shown */}
        <ItemField
          label="测量目标"
          hint={
            targetEmpty
              ? "建议填写：本测量旨在确定什么"
              : "本测量旨在确定什么"
          }
          hintClassName={targetEmpty ? "text-amber-500" : undefined}
        >
          <Textarea
            value={draft.target}
            onChange={(e) => set("target", e.target.value)}
            placeholder="如：确认 ZnO 薄膜的晶体结构与 c 轴取向"
            rows={2}
            className="resize-none text-sm"
          />
        </ItemField>

        {/* 测量条件 */}
        <ItemField label="测量条件" hint="点击标签修改；回车确认">
          <AttributeTagRow
            tags={draft.conditions}
            onChange={(tags) => set("conditions", tags)}
            keyPlaceholder="条件名"
            valuePlaceholder="值"
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
// MeasurementItemViewCard
// ---------------------------------------------------------------------------

export interface MeasurementItemViewCardProps {
  item: MeasurementItem;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updated: MeasurementItem) => void;
}

export function MeasurementItemViewCard({
  item,
  onEdit,
  onDelete,
  onUpdate,
}: MeasurementItemViewCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2.5 flex flex-col gap-1.5 group">
      {/* Name + instrument */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-semibold text-gray-900 hover:text-blue-700 transition-colors text-left"
            title="点击编辑"
          >
            {item.name || <span className="text-gray-300 font-normal italic">未命名测量项</span>}
          </button>
          {item.instrument && (
            <span className="flex-shrink-0 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 leading-none">
              {item.instrument}
            </span>
          )}
        </div>
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

      {/* Target — the "what we want to find out" */}
      {item.target && (
        <p className="text-xs text-gray-600 leading-relaxed">{item.target}</p>
      )}

      {/* Method badge */}
      {item.method && (
        <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 w-fit">
          {item.method}
        </span>
      )}

      {/* Conditions — direct key:value tag edit */}
      <AttributeTagRow
        tags={item.conditions}
        onChange={(tags) => onUpdate({ ...item, conditions: tags })}
        keyPlaceholder="条件名"
        valuePlaceholder="值"
      />

      <AttachmentViewStrip attachments={item.attachments ?? []} />
    </div>
  );
}
