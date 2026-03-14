/**
 * Step4OperationEditor — wizard card list for 实验操作 (Step 4).
 *
 * Shares OperationStepEditCard / OperationStepViewCard with the workbench
 * OperationModuleEditor. Wizard mode: showAttachments=false.
 *
 * order is auto-maintained:
 *   - New step: order = items.length + 1
 *   - After delete: items renumbered as index + 1
 *   - No manual order input exposed to the user.
 *
 * Write rule: onChange only updates items[]. Never writes to fields.
 */

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { OperationStep } from "@/types/ontologyModules";
import {
  OperationStepEditCard,
  OperationStepViewCard,
} from "@/pages/personal/workbench/modules/shared/OperationStepCards";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlankStep(order: number): OperationStep {
  return { id: makeId(), order, name: "", params: [] };
}

// ---------------------------------------------------------------------------
// Step4OperationEditor
// ---------------------------------------------------------------------------

interface Props {
  items: OperationStep[];
  onChange: (items: OperationStep[]) => void;
}

export function Step4OperationEditor({ items, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<OperationStep | null>(null);
  const [pendingNew, setPendingNew] = useState<OperationStep | null>(null);

  function startEdit(step: OperationStep) {
    setPendingNew(null);
    setEditingId(step.id);
    setEditDraft({ ...step, params: [...(step.params ?? [])] });
  }

  function saveEdit() {
    if (!editingId || !editDraft) return;
    onChange(items.map((s) => (s.id === editingId ? editDraft : s)));
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
    setPendingNew(makeBlankStep(items.length + 1));
  }

  function saveCreate() {
    if (!pendingNew || !pendingNew.name.trim()) return;
    onChange([...items, pendingNew]);
    setPendingNew(null);
  }

  function cancelCreate() {
    setPendingNew(null);
  }

  function deleteItem(id: string) {
    if (editingId === id) cancelEdit();
    const remaining = items
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    onChange(remaining);
  }

  function updateItemDirect(id: string, updated: OperationStep) {
    onChange(items.map((s) => (s.id === id ? updated : s)));
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.length === 0 && !pendingNew && (
        <p className="text-sm text-gray-400 py-2 text-center">
          尚未添加操作步骤，点击下方"新增步骤"开始
        </p>
      )}

      {items.map((step) =>
        editingId === step.id && editDraft ? (
          <OperationStepEditCard
            key={step.id}
            draft={editDraft}
            onChange={setEditDraft}
            onSave={saveEdit}
            onCancel={cancelEdit}
            showAttachments={false}
          />
        ) : (
          <OperationStepViewCard
            key={step.id}
            step={step}
            onEdit={() => startEdit(step)}
            onDelete={() => deleteItem(step.id)}
            onUpdate={(updated) => updateItemDirect(step.id, updated)}
          />
        ),
      )}

      {pendingNew && (
        <OperationStepEditCard
          draft={pendingNew}
          onChange={setPendingNew}
          onSave={saveCreate}
          onCancel={cancelCreate}
          showAttachments={false}
        />
      )}

      <button
        type="button"
        onClick={startCreate}
        className="flex items-center justify-center gap-1.5 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-3 hover:border-gray-400 hover:text-gray-600 transition-colors w-full"
      >
        <Plus size={14} />
        新增步骤
      </button>
    </div>
  );
}
