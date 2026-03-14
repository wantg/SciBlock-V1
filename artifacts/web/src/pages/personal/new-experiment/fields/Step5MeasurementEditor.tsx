/**
 * Step5MeasurementEditor — wizard-side list editor for Step 5 (测量过程).
 *
 * Shares MeasurementItemEditCard / MeasurementItemViewCard with the
 * workbench MeasurementModuleEditor.  Key difference: showAttachments=false
 * (attachments are not relevant at the planning stage).
 *
 * Write rule: only ever writes to Step5Data.items[].
 * Legacy Step5Data.fields is never touched here.
 */

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { MeasurementItem } from "@/types/ontologyModules";
import {
  MeasurementItemEditCard,
  MeasurementItemViewCard,
} from "@/pages/personal/workbench/modules/shared/MeasurementItemCards";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `meas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlankItem(): MeasurementItem {
  return { id: makeId(), name: "", target: "", conditions: [], attachments: [] };
}

// ---------------------------------------------------------------------------
// Step5MeasurementEditor
// ---------------------------------------------------------------------------

interface Props {
  items: MeasurementItem[];
  onChange: (items: MeasurementItem[]) => void;
}

export function Step5MeasurementEditor({ items, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MeasurementItem | null>(null);
  const [pendingNew, setPendingNew] = useState<MeasurementItem | null>(null);

  function startEdit(item: MeasurementItem) {
    setPendingNew(null);
    setEditingId(item.id);
    setEditDraft({ ...item, conditions: [...(item.conditions ?? [])] });
  }

  function saveEdit() {
    if (!editingId || !editDraft) return;
    onChange(items.map((m) => (m.id === editingId ? editDraft : m)));
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
    setPendingNew(makeBlankItem());
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
    onChange(items.filter((m) => m.id !== id));
  }

  function updateItemDirect(id: string, updated: MeasurementItem) {
    onChange(items.map((m) => (m.id === id ? updated : m)));
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.length === 0 && !pendingNew && (
        <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
          尚未添加测量项，点击下方"新增测量项"开始
        </p>
      )}

      {items.map((item) =>
        editingId === item.id && editDraft ? (
          <MeasurementItemEditCard
            key={item.id}
            draft={editDraft}
            onChange={setEditDraft}
            onSave={saveEdit}
            onCancel={cancelEdit}
            showAttachments={false}
          />
        ) : (
          <MeasurementItemViewCard
            key={item.id}
            item={item}
            onEdit={() => startEdit(item)}
            onDelete={() => deleteItem(item.id)}
            onUpdate={(updated) => updateItemDirect(item.id, updated)}
          />
        ),
      )}

      {pendingNew && (
        <MeasurementItemEditCard
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
        className="flex items-center justify-center gap-1.5 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:border-gray-400 hover:text-gray-700 transition-colors w-full"
      >
        <Plus size={14} />
        新增测量项
      </button>
    </div>
  );
}
