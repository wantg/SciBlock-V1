/**
 * SystemModuleEditor — per-item inline editing for the 实验系统 module.
 *
 * Architecture:
 *  - Items always visible (no module-level editing gate).
 *  - Each item is independently in view | editing | creating mode.
 *  - VIEW mode: role badge is clickable (enters edit); tag X removes directly;
 *    tag "+" input adds directly; clicking name or description enters edit.
 *  - EDIT mode: full card form with per-item save ✓ and cancel ✗.
 *  - CREATING: new blank card (same as edit, cancel = remove).
 *  - All writes go immediately to onUpdate (no module-level draft).
 */

import React, { useState, useRef } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SystemObject, AttachmentMeta } from "@/types/ontologyModules";
import { ItemCard } from "./shared/ItemCard";
import { ItemField } from "./shared/ItemField";
import { AttachmentArea } from "./shared/AttachmentArea";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = ["研究基底", "靶材", "设备", "试剂", "其他"] as const;

const ROLE_COLORS: Record<string, string> = {
  研究基底: "bg-blue-50 text-blue-700 border-blue-200",
  靶材:     "bg-violet-50 text-violet-700 border-violet-200",
  设备:     "bg-gray-100 text-gray-600 border-gray-200",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlankObject(): SystemObject {
  return { id: makeId(), name: "", role: "研究基底", attributes: [], attachments: [] };
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
  const [attrInput, setAttrInput] = useState("");

  function set<K extends keyof SystemObject>(key: K, value: SystemObject[K]) {
    onChange({ ...draft, [key]: value });
  }

  function addAttr() {
    const trimmed = attrInput.trim();
    if (!trimmed || draft.attributes.includes(trimmed)) return;
    onChange({ ...draft, attributes: [...draft.attributes, trimmed] });
    setAttrInput("");
  }

  function removeAttr(attr: string) {
    onChange({ ...draft, attributes: draft.attributes.filter((a) => a !== attr) });
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
          <div className="flex flex-wrap gap-1.5">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => set("role", role)}
                className={[
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  draft.role === role
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400",
                ].join(" ")}
              >
                {role}
              </button>
            ))}
          </div>
        </ItemField>

        {/* Attributes */}
        <ItemField label="属性标签" hint="输入后按 Enter 添加；点击 × 删除">
          <div className="flex flex-col gap-2">
            {draft.attributes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {draft.attributes.map((attr) => (
                  <span
                    key={attr}
                    className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5"
                  >
                    {attr}
                    <button
                      type="button"
                      onClick={() => removeAttr(attr)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Input
                value={attrInput}
                onChange={(e) => setAttrInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addAttr(); }
                  if (e.key === "Escape") setAttrInput("");
                }}
                placeholder="输入属性标签，如：4英寸"
                className="h-7 text-xs flex-1"
              />
              <button
                type="button"
                onClick={addAttr}
                disabled={!attrInput.trim()}
                className="text-green-600 hover:text-green-700 disabled:opacity-30 transition-colors"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
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
// SystemObjectViewCard — read-only card with direct-action inline interactions
// ---------------------------------------------------------------------------

interface ViewCardProps {
  object: SystemObject;
  onEdit: () => void;
  onDelete: () => void;
  /** Direct update without entering full edit mode (role, tag changes). */
  onUpdate: (updated: SystemObject) => void;
}

function SystemObjectViewCard({ object, onEdit, onDelete, onUpdate }: ViewCardProps) {
  const [addTagInput, setAddTagInput] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const addTagRef = useRef<HTMLInputElement>(null);

  function removeAttr(attr: string) {
    onUpdate({ ...object, attributes: object.attributes.filter((a) => a !== attr) });
  }

  function addAttr() {
    const trimmed = addTagInput.trim();
    if (!trimmed || object.attributes.includes(trimmed)) return;
    onUpdate({ ...object, attributes: [...object.attributes, trimmed] });
    setAddTagInput("");
    setShowAddTag(false);
  }

  const roleColor = ROLE_COLORS[object.role] ?? "bg-gray-100 text-gray-500 border-gray-200";

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
          {/* Role badge — click to enter edit mode */}
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

      {/* Attributes + add tag */}
      <div className="px-3 pb-2 flex flex-wrap gap-1.5 items-center">
        {object.attributes.map((attr) => (
          <span
            key={attr}
            className="inline-flex items-center gap-0.5 text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5"
          >
            {attr}
            <button
              type="button"
              onClick={() => removeAttr(attr)}
              className="text-gray-300 hover:text-red-500 transition-colors leading-none ml-0.5"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {showAddTag ? (
          <div className="flex items-center gap-1">
            <Input
              ref={addTagRef}
              autoFocus
              value={addTagInput}
              onChange={(e) => setAddTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addAttr(); }
                if (e.key === "Escape") { setAddTagInput(""); setShowAddTag(false); }
              }}
              onBlur={() => { if (!addTagInput.trim()) setShowAddTag(false); }}
              placeholder="添加标签…"
              className="h-6 text-xs w-24 px-1.5"
            />
            <button type="button" onClick={addAttr} className="text-green-600 hover:text-green-700">
              <Check size={12} />
            </button>
            <button type="button" onClick={() => { setAddTagInput(""); setShowAddTag(false); }} className="text-gray-400">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddTag(true)}
            className="inline-flex items-center gap-0.5 text-[11px] text-gray-300 border border-dashed border-gray-200 rounded-full px-2 py-0.5 hover:text-gray-500 hover:border-gray-400 transition-colors"
          >
            <Plus size={10} /> 添加
          </button>
        )}
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

      {/* Attachment count hint */}
      {(object.attachments?.length ?? 0) > 0 && (
        <div className="px-3 pb-2 text-[10px] text-gray-300">
          {object.attachments!.length} 个附件
        </div>
      )}
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
