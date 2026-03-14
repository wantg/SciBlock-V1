import React, { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SystemObject, AttachmentMeta } from "@/types/ontologyModules";
import { ItemCard } from "./shared/ItemCard";
import { ItemField } from "./shared/ItemField";
import { AttachmentArea } from "./shared/AttachmentArea";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = ["研究基底", "靶材", "设备", "试剂", "其他"] as const;

function makeId(): string {
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeObject(): SystemObject {
  return { id: makeId(), name: "", role: "研究基底", attributes: [], attachments: [] };
}

// ---------------------------------------------------------------------------
// SystemObjectItem — form for editing a single SystemObject
// ---------------------------------------------------------------------------

interface ItemProps {
  object: SystemObject;
  onChange: (updated: SystemObject) => void;
  onDelete: () => void;
}

function SystemObjectItem({ object, onChange, onDelete }: ItemProps) {
  const [attrInput, setAttrInput] = useState("");

  function set<K extends keyof SystemObject>(key: K, value: SystemObject[K]) {
    onChange({ ...object, [key]: value });
  }

  function addAttr() {
    const trimmed = attrInput.trim();
    if (!trimmed || object.attributes.includes(trimmed)) return;
    onChange({ ...object, attributes: [...object.attributes, trimmed] });
    setAttrInput("");
  }

  function removeAttr(attr: string) {
    onChange({ ...object, attributes: object.attributes.filter((a) => a !== attr) });
  }

  function updateAttachments(attachments: AttachmentMeta[]) {
    onChange({ ...object, attachments });
  }

  return (
    <ItemCard
      title={object.name || "新对象"}
      subtitle={object.role}
      onDelete={onDelete}
    >
      {/* Name */}
      <ItemField label="名称" required>
        <Input
          value={object.name}
          onChange={(e) => set("name", e.target.value)}
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
                object.role === role
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400",
              ].join(" ")}
            >
              {role}
            </button>
          ))}
        </div>
      </ItemField>

      {/* Attributes (chips) */}
      <ItemField label="属性标签" hint="回车或点击 ✓ 添加；点击 × 删除">
        <div className="flex flex-col gap-2">
          {/* Existing chips */}
          {object.attributes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {object.attributes.map((attr) => (
                <span
                  key={attr}
                  className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5"
                >
                  {attr}
                  <button
                    type="button"
                    onClick={() => removeAttr(attr)}
                    className="text-gray-400 hover:text-red-500 transition-colors leading-none"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add input */}
          <div className="flex items-center gap-1.5">
            <Input
              value={attrInput}
              onChange={(e) => setAttrInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addAttr(); }
                if (e.key === "Escape") setAttrInput("");
              }}
              placeholder="如：4英寸、1–10 Ω·cm…"
              className="h-7 text-xs flex-1"
            />
            <button
              type="button"
              onClick={addAttr}
              disabled={!attrInput.trim()}
              className="text-green-600 hover:text-green-700 disabled:opacity-30 p-0.5 transition-colors"
              title="添加标签"
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      </ItemField>

      {/* Description */}
      <ItemField label="描述">
        <Textarea
          value={object.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="简要描述该对象的作用或来源…"
          rows={2}
          className="resize-none text-sm"
        />
      </ItemField>

      {/* Attachments */}
      <AttachmentArea
        attachments={object.attachments ?? []}
        onChange={updateAttachments}
      />
    </ItemCard>
  );
}

// ---------------------------------------------------------------------------
// SystemModuleEditor — list manager for SystemObject[]
// ---------------------------------------------------------------------------

interface EditorProps {
  objects: SystemObject[];
  onChange: (objects: SystemObject[]) => void;
}

/**
 * SystemModuleEditor — structured editing UI for the 实验系统 module.
 *
 * Each research object is an `ItemCard` with name, role selector, attribute
 * chip editor, description textarea, and per-item attachment area.
 * The UI deliberately mirrors the wizard's FieldCard / ObjectItemCard pattern.
 */
export function SystemModuleEditor({ objects, onChange }: EditorProps) {
  function updateItem(id: string, updated: SystemObject) {
    onChange(objects.map((o) => (o.id === id ? updated : o)));
  }

  function deleteItem(id: string) {
    onChange(objects.filter((o) => o.id !== id));
  }

  function addItem() {
    onChange([...objects, makeObject()]);
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {objects.length === 0 && (
        <p className="text-xs text-gray-300 py-1">
          尚无对象，点击下方按钮添加第一个研究对象
        </p>
      )}

      {objects.map((obj) => (
        <SystemObjectItem
          key={obj.id}
          object={obj}
          onChange={(updated) => updateItem(obj.id, updated)}
          onDelete={() => deleteItem(obj.id)}
        />
      ))}

      <button
        type="button"
        onClick={addItem}
        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 hover:border-gray-400 hover:text-gray-600 transition-colors w-full"
      >
        <Plus size={12} />
        新增对象
      </button>
    </div>
  );
}
