/**
 * MeasurementModuleEditor — per-item inline editing for the 测量过程 module.
 *
 * Same architecture as SystemModuleEditor / OperationModuleEditor:
 *  - Per-item view | editing | creating state.
 *  - VIEW card: click name or pencil → enters edit for that item.
 *  - EDIT card: full form with per-item save ✓ and cancel ✗.
 *  - Saves go directly to onUpdate — no module-level draft.
 */

import React, { useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MeasurementItem, AttachmentMeta } from "@/types/ontologyModules";
import { ItemField } from "./shared/ItemField";
import { AttachmentArea } from "./shared/AttachmentArea";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `meas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlankMeasurement(): MeasurementItem {
  return { id: makeId(), name: "", target: "", attachments: [] };
}

// ---------------------------------------------------------------------------
// MeasurementItemEditCard
// ---------------------------------------------------------------------------

interface EditCardProps {
  draft: MeasurementItem;
  onChange: (updated: MeasurementItem) => void;
  onSave: () => void;
  onCancel: () => void;
}

function MeasurementItemEditCard({ draft, onChange, onSave, onCancel }: EditCardProps) {
  function set<K extends keyof MeasurementItem>(key: K, value: MeasurementItem[K]) {
    onChange({ ...draft, [key]: value });
  }

  const canSave = draft.name.trim().length > 0;

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

        <ItemField label="仪器 / 设备">
          <Input
            value={draft.instrument ?? ""}
            onChange={(e) => set("instrument", e.target.value)}
            placeholder="如：Rigaku SmartLab"
            className="h-8 text-sm"
          />
        </ItemField>

        <ItemField label="测量方法" hint="如：θ-2θ 扫描、掠入射 XRD…">
          <Input
            value={draft.method ?? ""}
            onChange={(e) => set("method", e.target.value)}
            placeholder="如：θ-2θ 扫描 (10°–80°)"
            className="h-8 text-sm font-mono"
          />
        </ItemField>

        <ItemField label="测量目标" required hint="本测量旨在确定什么">
          <Textarea
            value={draft.target}
            onChange={(e) => set("target", e.target.value)}
            placeholder="如：确认 ZnO 薄膜的晶体结构与 c 轴取向…"
            rows={2}
            className="resize-none text-sm"
          />
        </ItemField>

        <ItemField label="测量条件">
          <Input
            value={draft.conditions ?? ""}
            onChange={(e) => set("conditions", e.target.value)}
            placeholder="如：室温，步长 0.01°，速度 2°/min"
            className="h-8 text-sm"
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
// MeasurementItemViewCard
// ---------------------------------------------------------------------------

interface ViewCardProps {
  item: MeasurementItem;
  onEdit: () => void;
  onDelete: () => void;
}

function MeasurementItemViewCard({ item, onEdit, onDelete }: ViewCardProps) {
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
          <button type="button" onClick={onEdit} className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors" title="编辑">
            <Pencil size={11} />
          </button>
          <button type="button" onClick={onDelete} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors" title="删除">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Target */}
      {item.target && (
        <p className="text-xs text-gray-600 leading-relaxed">{item.target}</p>
      )}

      {/* Method + conditions */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {item.method && (
          <span className="text-[11px] font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
            {item.method}
          </span>
        )}
        {item.conditions && (
          <span className="text-[11px] text-gray-400">{item.conditions}</span>
        )}
      </div>

      {(item.attachments?.length ?? 0) > 0 && (
        <span className="text-[10px] text-gray-300">{item.attachments!.length} 个附件</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MeasurementModuleEditor
// ---------------------------------------------------------------------------

interface EditorProps {
  items: MeasurementItem[];
  onUpdate: (items: MeasurementItem[]) => void;
}

export function MeasurementModuleEditor({ items, onUpdate }: EditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MeasurementItem | null>(null);
  const [pendingNew, setPendingNew] = useState<MeasurementItem | null>(null);

  function startEdit(item: MeasurementItem) {
    setPendingNew(null);
    setEditingId(item.id);
    setEditDraft({ ...item });
  }

  function saveEdit() {
    if (!editingId || !editDraft) return;
    onUpdate(items.map((m) => (m.id === editingId ? editDraft : m)));
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
    setPendingNew(makeBlankMeasurement());
  }

  function saveCreate() {
    if (!pendingNew || !pendingNew.name.trim()) return;
    onUpdate([...items, pendingNew]);
    setPendingNew(null);
  }

  function cancelCreate() {
    setPendingNew(null);
  }

  function deleteItem(id: string) {
    if (editingId === id) cancelEdit();
    onUpdate(items.filter((m) => m.id !== id));
  }

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      {items.length === 0 && !pendingNew && (
        <p className="text-xs text-gray-300 py-1 text-center">
          暂无测量项，点击"新增测量项"开始添加
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
          />
        ) : (
          <MeasurementItemViewCard
            key={item.id}
            item={item}
            onEdit={() => startEdit(item)}
            onDelete={() => deleteItem(item.id)}
          />
        ),
      )}

      {pendingNew && (
        <MeasurementItemEditCard
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
        新增测量项
      </button>
    </div>
  );
}
