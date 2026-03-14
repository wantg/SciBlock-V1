/**
 * PreparationModuleEditor — per-item inline editing for the 实验准备 module.
 *
 * Same architecture as the other three priority editors. Replaces the
 * legacy textarea fallback so all 4 structured modules are consistent.
 *
 * Fields per PrepItem: 名称, 分类, 用量/规格, 处理方式, 时长, 备注, 附件.
 */

import React, { useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PrepItem, AttachmentMeta } from "@/types/ontologyModules";
import { ItemField } from "./shared/ItemField";
import { AttachmentArea } from "./shared/AttachmentArea";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = ["基底清洗", "表面活化", "靶材处理", "气体配置", "其他"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  基底清洗: "bg-sky-50 text-sky-700 border-sky-200",
  表面活化: "bg-amber-50 text-amber-700 border-amber-200",
  靶材处理: "bg-violet-50 text-violet-700 border-violet-200",
  气体配置: "bg-teal-50 text-teal-700 border-teal-200",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `prep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlankPrepItem(): PrepItem {
  return { id: makeId(), name: "", category: "基底清洗", attachments: [] };
}

// ---------------------------------------------------------------------------
// PrepItemEditCard
// ---------------------------------------------------------------------------

interface EditCardProps {
  draft: PrepItem;
  onChange: (updated: PrepItem) => void;
  onSave: () => void;
  onCancel: () => void;
}

function PrepItemEditCard({ draft, onChange, onSave, onCancel }: EditCardProps) {
  function set<K extends keyof PrepItem>(key: K, value: PrepItem[K]) {
    onChange({ ...draft, [key]: value });
  }

  const canSave = draft.name.trim().length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
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

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Name */}
        <ItemField label="名称" required>
          <Input
            autoFocus
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canSave) onSave(); }}
            placeholder="如：丙酮超声清洗、ZnO 靶材预溅射"
            className="h-8 text-sm"
          />
        </ItemField>

        {/* Category */}
        <ItemField label="分类">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => set("category", cat)}
                className={[
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  draft.category === cat
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
          </div>
        </ItemField>

        {/* Spec */}
        <ItemField label="用量 / 规格" hint="如：20 mL、分析纯、99.99%">
          <Input
            value={draft.spec ?? ""}
            onChange={(e) => set("spec", e.target.value)}
            placeholder="如：分析纯丙酮 20 mL"
            className="h-8 text-sm"
          />
        </ItemField>

        {/* Treatment */}
        <ItemField label="处理方式" hint="如：超声 15 min、等离子活化">
          <Input
            value={draft.treatment ?? ""}
            onChange={(e) => set("treatment", e.target.value)}
            placeholder="如：超声 15 min，氮气吹干"
            className="h-8 text-sm"
          />
        </ItemField>

        {/* Duration */}
        <ItemField label="时长">
          <Input
            value={draft.duration ?? ""}
            onChange={(e) => set("duration", e.target.value)}
            placeholder="如：15 min、30 s"
            className="h-8 text-sm"
          />
        </ItemField>

        {/* Notes */}
        <ItemField label="备注">
          <Textarea
            value={draft.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="注意事项、替代方案或补充说明…"
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
// PrepItemViewCard
// ---------------------------------------------------------------------------

interface ViewCardProps {
  item: PrepItem;
  onEdit: () => void;
  onDelete: () => void;
}

function PrepItemViewCard({ item, onEdit, onDelete }: ViewCardProps) {
  const catColor = CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2 group">
      {/* Category badge */}
      <button
        type="button"
        onClick={onEdit}
        className={[
          "flex-shrink-0 mt-0.5 text-[10px] font-medium border rounded px-1.5 py-0.5 leading-none whitespace-nowrap hover:opacity-70 transition-opacity",
          catColor,
        ].join(" ")}
        title="点击编辑"
      >
        {item.category}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-gray-800 text-left hover:text-blue-700 transition-colors leading-snug"
          title="点击编辑"
        >
          {item.name || <span className="text-gray-300 font-normal italic">未命名准备项</span>}
        </button>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
          {item.spec && (
            <span className="text-[11px] text-gray-500">{item.spec}</span>
          )}
          {item.treatment && (
            <span className="text-[11px] text-gray-400">{item.treatment}</span>
          )}
          {item.duration && (
            <span className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
              {item.duration}
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
        )}
        {(item.attachments?.length ?? 0) > 0 && (
          <span className="text-[10px] text-gray-300">{item.attachments!.length} 个附件</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit} className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors" title="编辑">
          <Pencil size={11} />
        </button>
        <button type="button" onClick={onDelete} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors" title="删除">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PreparationModuleEditor
// ---------------------------------------------------------------------------

interface EditorProps {
  items: PrepItem[];
  onUpdate: (items: PrepItem[]) => void;
}

export function PreparationModuleEditor({ items, onUpdate }: EditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PrepItem | null>(null);
  const [pendingNew, setPendingNew] = useState<PrepItem | null>(null);

  function startEdit(item: PrepItem) {
    setPendingNew(null);
    setEditingId(item.id);
    setEditDraft({ ...item });
  }

  function saveEdit() {
    if (!editingId || !editDraft) return;
    onUpdate(items.map((p) => (p.id === editingId ? editDraft : p)));
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
    setPendingNew(makeBlankPrepItem());
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
    onUpdate(items.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      {items.length === 0 && !pendingNew && (
        <p className="text-xs text-gray-300 py-1 text-center">
          暂无准备项，点击"新增准备项"开始添加
        </p>
      )}

      {items.map((item) =>
        editingId === item.id && editDraft ? (
          <PrepItemEditCard
            key={item.id}
            draft={editDraft}
            onChange={setEditDraft}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        ) : (
          <PrepItemViewCard
            key={item.id}
            item={item}
            onEdit={() => startEdit(item)}
            onDelete={() => deleteItem(item.id)}
          />
        ),
      )}

      {pendingNew && (
        <PrepItemEditCard
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
        新增准备项
      </button>
    </div>
  );
}
