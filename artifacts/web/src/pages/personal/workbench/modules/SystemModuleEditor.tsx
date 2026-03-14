/**
 * SystemModuleEditor — per-item inline editing for the 实验系统 module.
 *
 * Architecture:
 *  - Items always visible (no module-level editing gate).
 *  - Each item independently in view | editing | creating mode.
 *  - Attribute tags use the same TagBadge (key:value) as the wizard's ObjectItemCard.
 *  - VIEW mode: click name/role/description → enters edit; TagBadge inline-edits directly;
 *    "+" adds a new key:value tag without entering full edit.
 *  - EDIT mode: full card form with per-item save ✓ and cancel ✗.
 *  - CREATING: blank card (same as edit; cancel = remove).
 *  - All writes go immediately to onUpdate (no module-level draft).
 */

import React, { useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SystemObject } from "@/types/ontologyModules";
import { SYSTEM_ROLE } from "@/config/ontologyOptions";
import { ItemField } from "./shared/ItemField";
import { AttachmentArea } from "./shared/AttachmentArea";
import { AttachmentViewStrip } from "./shared/AttachmentViewStrip";
import { AttributeTagRow } from "./shared/AttributeTagRow";
import { OntologyPicker } from "./shared/OntologyPicker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlankObject(): SystemObject {
  return { id: makeId(), name: "", role: SYSTEM_ROLE.defaultValue, attributes: [], attachments: [] };
}

// ---------------------------------------------------------------------------
// SystemObjectEditCard — full structured form for editing / creating an item
// ---------------------------------------------------------------------------

interface EditCardProps {
  draft: SystemObject;
  onChange: (updated: SystemObject) => void;
  onSave: () => void;
  onCancel: () => void;
}

function SystemObjectEditCard({ draft, onChange, onSave, onCancel }: EditCardProps) {
  function set<K extends keyof SystemObject>(key: K, value: SystemObject[K]) {
    onChange({ ...draft, [key]: value });
  }

  const canSave = draft.name.trim().length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <span className="text-sm font-medium text-gray-700 truncate">
          {draft.name.trim() || "新对象"}
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
            placeholder="如：Si(100) 基底"
            className="h-8 text-sm"
          />
        </ItemField>

        {/* Role */}
        <ItemField label="角色">
          <OntologyPicker
            value={draft.role}
            options={SYSTEM_ROLE.options}
            onChange={(v) => set("role", v)}
          />
        </ItemField>

        {/* Attributes — same TagBadge as wizard */}
        <ItemField label="属性标签" hint="点击标签可修改 key 或 value；回车确认">
          <AttributeTagRow
            tags={draft.attributes}
            onChange={(tags) => set("attributes", tags)}
          />
        </ItemField>

        {/* Description */}
        <ItemField label="描述">
          <Textarea
            value={draft.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="简要描述该对象的作用或来源…"
            rows={2}
            className="resize-none text-sm"
          />
        </ItemField>

        {/* Attachments */}
        <AttachmentArea
          attachments={draft.attachments ?? []}
          onChange={(attachments) => set("attachments", attachments)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SystemObjectViewCard — compact card with direct tag interactions
// ---------------------------------------------------------------------------

interface ViewCardProps {
  object: SystemObject;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updated: SystemObject) => void;
}

function SystemObjectViewCard({ object, onEdit, onDelete, onUpdate }: ViewCardProps) {
  const roleColor = SYSTEM_ROLE.colors[object.role] ?? "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm group">
      {/* Header — name + role badge + actions */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-semibold text-gray-900 hover:text-blue-700 transition-colors text-left truncate"
            title="点击编辑"
          >
            {object.name || <span className="text-gray-300 font-normal italic">未命名对象</span>}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className={[
              "flex-shrink-0 text-[10px] font-medium border rounded px-1.5 py-0.5 leading-none transition-opacity hover:opacity-70",
              roleColor,
            ].join(" ")}
            title="点击修改角色"
          >
            {object.role}
          </button>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
            title="编辑"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Attributes — TagBadge directly editable without entering full edit mode */}
      <div className="px-3 pb-2">
        <AttributeTagRow
          tags={object.attributes}
          onChange={(tags) => onUpdate({ ...object, attributes: tags })}
        />
      </div>

      {/* Description — click to edit */}
      {object.description ? (
        <button
          type="button"
          onClick={onEdit}
          className="px-3 pb-2.5 text-xs text-gray-400 leading-relaxed text-left hover:text-gray-600 transition-colors w-full"
        >
          {object.description}
        </button>
      ) : null}

      {/* Attachment strip — collapsible, replaces old plain-text "N 个附件" */}
      <div className="px-3 pb-2">
        <AttachmentViewStrip attachments={object.attachments ?? []} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SystemModuleEditor — list manager with per-item state
// ---------------------------------------------------------------------------

interface EditorProps {
  objects: SystemObject[];
  onUpdate: (objects: SystemObject[]) => void;
}

export function SystemModuleEditor({ objects, onUpdate }: EditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SystemObject | null>(null);
  const [pendingNew, setPendingNew] = useState<SystemObject | null>(null);

  function startEdit(obj: SystemObject) {
    setPendingNew(null);
    setEditingId(obj.id);
    setEditDraft({ ...obj, attributes: [...obj.attributes], attachments: [...(obj.attachments ?? [])] });
  }

  function saveEdit() {
    if (!editingId || !editDraft) return;
    onUpdate(objects.map((o) => (o.id === editingId ? editDraft : o)));
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
    setPendingNew(makeBlankObject());
  }

  function saveCreate() {
    if (!pendingNew || !pendingNew.name.trim()) return;
    onUpdate([...objects, pendingNew]);
    setPendingNew(null);
  }

  function cancelCreate() {
    setPendingNew(null);
  }

  function deleteItem(id: string) {
    if (editingId === id) cancelEdit();
    onUpdate(objects.filter((o) => o.id !== id));
  }

  function updateItemDirect(id: string, updated: SystemObject) {
    onUpdate(objects.map((o) => (o.id === id ? updated : o)));
  }

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      {objects.length === 0 && !pendingNew && (
        <p className="text-xs text-gray-300 py-1 text-center">
          暂无对象，点击"新增对象"开始添加
        </p>
      )}

      {objects.map((obj) =>
        editingId === obj.id && editDraft ? (
          <SystemObjectEditCard
            key={obj.id}
            draft={editDraft}
            onChange={setEditDraft}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        ) : (
          <SystemObjectViewCard
            key={obj.id}
            object={obj}
            onEdit={() => startEdit(obj)}
            onDelete={() => deleteItem(obj.id)}
            onUpdate={(updated) => updateItemDirect(obj.id, updated)}
          />
        ),
      )}

      {pendingNew && (
        <SystemObjectEditCard
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
        新增对象
      </button>
    </div>
  );
}
