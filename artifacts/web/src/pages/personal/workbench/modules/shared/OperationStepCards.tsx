/**
 * OperationStepCards — shared edit/view card pair for the OperationStep model.
 *
 * Used by:
 *   - OperationModuleEditor (workbench, showAttachments=true)
 *   - Step4OperationEditor (wizard, showAttachments=false)
 *
 * order is displayed in both view and edit modes as a numbered circle.
 * order is NOT user-editable — maintained automatically by the editor
 * (index+1 on create; renumbered on delete).
 *
 * UI labels: "备注 / 注意事项" throughout. Never shows "notes" as a raw key.
 */

import React from "react";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OperationStep } from "@/types/ontologyModules";
import { ItemField } from "./ItemField";
import { AttachmentArea } from "./AttachmentArea";
import { AttachmentViewStrip } from "./AttachmentViewStrip";
import { AttributeTagRow } from "./AttributeTagRow";

// ---------------------------------------------------------------------------
// OperationStepEditCard
// ---------------------------------------------------------------------------

export interface OperationStepEditCardProps {
  draft: OperationStep;
  onChange: (updated: OperationStep) => void;
  onSave: () => void;
  onCancel: () => void;
  /** Whether to show the attachment section. False in wizard, true in workbench. */
  showAttachments?: boolean;
}

export function OperationStepEditCard({
  draft,
  onChange,
  onSave,
  onCancel,
  showAttachments = true,
}: OperationStepEditCardProps) {
  function set<K extends keyof OperationStep>(key: K, value: OperationStep[K]) {
    onChange({ ...draft, [key]: value });
  }

  const canSave = draft.name.trim().length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header — shows step number (read-only) + live name preview */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <span className="text-sm font-medium text-gray-600">
          步骤 <span className="font-bold text-gray-900">{draft.order}</span>
          {draft.name.trim() && (
            <span className="ml-1.5 text-gray-500 font-normal truncate">— {draft.name}</span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
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
        <ItemField label="步骤名称" required>
          <Input
            autoFocus
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canSave) onSave(); }}
            placeholder="如：装载基底，腔室抽至本底真空"
            className="h-8 text-sm"
          />
        </ItemField>

        <ItemField label="关键参数" hint="点击标签修改；回车确认">
          <AttributeTagRow
            tags={draft.params}
            onChange={(tags) => set("params", tags)}
            keyPlaceholder="参数名"
            valuePlaceholder="量值"
          />
        </ItemField>

        <ItemField label="备注 / 注意事项">
          <Textarea
            value={draft.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="操作注意事项、安全提示或观察要点…"
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
// OperationStepViewCard
// ---------------------------------------------------------------------------

export interface OperationStepViewCardProps {
  step: OperationStep;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updated: OperationStep) => void;
}

export function OperationStepViewCard({
  step,
  onEdit,
  onDelete,
  onUpdate,
}: OperationStepViewCardProps) {
  return (
    <div className="flex gap-3 group">
      {/* Step number circle */}
      <div className="flex flex-col items-center flex-shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 hover:bg-gray-700 transition-colors"
          title="编辑步骤"
        >
          {step.order}
        </button>
      </div>

      {/* Content card */}
      <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-gray-800 leading-snug text-left hover:text-blue-700 transition-colors flex-1"
            title="点击编辑"
          >
            {step.name || <span className="text-gray-300 font-normal italic">未命名步骤</span>}
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

        {/* Key params — direct inline edit */}
        <AttributeTagRow
          tags={step.params}
          onChange={(tags) => onUpdate({ ...step, params: tags })}
          keyPlaceholder="参数名"
          valuePlaceholder="量值"
        />

        {/* 备注/注意事项 — visible in view mode */}
        {step.notes && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-gray-500 leading-relaxed text-left hover:text-gray-700 transition-colors w-full"
          >
            {step.notes}
          </button>
        )}

        <AttachmentViewStrip attachments={step.attachments ?? []} />
      </div>
    </div>
  );
}
