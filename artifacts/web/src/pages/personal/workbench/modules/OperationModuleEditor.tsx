/**
 * OperationModuleEditor — per-item inline editing for the 实验操作 module.
 *
 * Each step is independently in view | editing | creating mode.
 * VIEW: click step name or pencil → enters editing for that step.
 * EDIT: full card form with per-step save ✓ and cancel ✗.
 * Saves go directly to onUpdate (no module-level draft).
 */

import React, { useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OperationStep, AttachmentMeta } from "@/types/ontologyModules";
import { ItemField } from "./shared/ItemField";
import { AttachmentArea } from "./shared/AttachmentArea";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlankStep(order: number): OperationStep {
  return { id: makeId(), order, name: "", attachments: [] };
}

// ---------------------------------------------------------------------------
// OperationStepEditCard
// ---------------------------------------------------------------------------

interface EditCardProps {
  draft: OperationStep;
  onChange: (updated: OperationStep) => void;
  onSave: () => void;
  onCancel: () => void;
}

function OperationStepEditCard({ draft, onChange, onSave, onCancel }: EditCardProps) {
  function set<K extends keyof OperationStep>(key: K, value: OperationStep[K]) {
    onChange({ ...draft, [key]: value });
  }

  const canSave = draft.name.trim().length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
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

        <ItemField label="关键参数" hint="功率、温度、时长等关键量">
          <Input
            value={draft.params ?? ""}
            onChange={(e) => set("params", e.target.value)}
            placeholder="如：RF 150 W, 5 min, Ar 20 sccm"
            className="h-8 text-sm font-mono"
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

        <AttachmentArea
          attachments={draft.attachments ?? []}
          onChange={(attachments) => set("attachments", attachments)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OperationStepViewCard
// ---------------------------------------------------------------------------

interface ViewCardProps {
  step: OperationStep;
  onEdit: () => void;
  onDelete: () => void;
}

function OperationStepViewCard({ step, onEdit, onDelete }: ViewCardProps) {
  return (
    <div className="flex gap-3 group">
      {/* Step number */}
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
      <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2 flex flex-col gap-1">
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
            <button type="button" onClick={onEdit} className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors" title="编辑">
              <Pencil size={11} />
            </button>
            <button type="button" onClick={onDelete} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors" title="删除">
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {step.params && (
          <span className="text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 w-fit">
            {step.params}
          </span>
        )}
        {step.notes && (
          <p className="text-xs text-gray-400 leading-relaxed">{step.notes}</p>
        )}
        {(step.attachments?.length ?? 0) > 0 && (
          <span className="text-[10px] text-gray-300">{step.attachments!.length} 个附件</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OperationModuleEditor
// ---------------------------------------------------------------------------

interface EditorProps {
  steps: OperationStep[];
  onUpdate: (steps: OperationStep[]) => void;
}

export function OperationModuleEditor({ steps, onUpdate }: EditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<OperationStep | null>(null);
  const [pendingNew, setPendingNew] = useState<OperationStep | null>(null);

  function startEdit(step: OperationStep) {
    setPendingNew(null);
    setEditingId(step.id);
    setEditDraft({ ...step });
  }

  function saveEdit() {
    if (!editingId || !editDraft) return;
    onUpdate(steps.map((s) => (s.id === editingId ? editDraft : s)));
    setEditingId(null);
    setEditDraft(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  function startCreate() {
    setEditingId(null);
    setEditDraft(null);
    setPendingNew(makeBlankStep(steps.length + 1));
  }

  function saveCreate() {
    if (!pendingNew || !pendingNew.name.trim()) return;
    onUpdate([...steps, pendingNew]);
    setPendingNew(null);
  }

  function cancelCreate() {
    setPendingNew(null);
  }

  function deleteItem(id: string) {
    if (editingId === id) cancelEdit();
    // Re-number after deletion
    const remaining = steps
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    onUpdate(remaining);
  }

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      {steps.length === 0 && !pendingNew && (
        <p className="text-xs text-gray-300 py-1 text-center">
          暂无操作步骤，点击"新增步骤"开始添加
        </p>
      )}

      {steps.map((step) =>
        editingId === step.id && editDraft ? (
          <OperationStepEditCard
            key={step.id}
            draft={editDraft}
            onChange={setEditDraft}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        ) : (
          <OperationStepViewCard
            key={step.id}
            step={step}
            onEdit={() => startEdit(step)}
            onDelete={() => deleteItem(step.id)}
          />
        ),
      )}

      {pendingNew && (
        <OperationStepEditCard
          draft={pendingNew}
          onChange={setPendingNew}
          onSave={saveCreate}
          onCancel={cancelCreate}
        />
      )}

      <button
        type="button"
        onClick={startCreate}
        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 hover:border-gray-400 hover:text-gray-600 transition-colors w-full"
      >
        <Plus size={12} />
        新增步骤
      </button>
    </div>
  );
}
