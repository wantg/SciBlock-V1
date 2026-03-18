/**
 * AttributeTagRow — shared key:value tag strip used by all ontology module editors.
 *
 * Renders:
 *  - A row of TagBadge pills (each click-to-inline-edit, X-to-delete).
 *  - An "+ 标签" ghost button that expands to a two-input [key]:[value] add form.
 *
 * Mirrors the exact interaction used in the wizard's ObjectItemCard so every
 * module presents the same structured attribute editing language.
 */

import React, { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { TagBadge } from "@/components/ui/TagBadge";
import type { Tag } from "@/types/experimentFields";
import { makeTag } from "@/types/experimentFields";

// ---------------------------------------------------------------------------
// AddTagInline — key:value double-input add form (matches wizard ObjectItemCard)
// ---------------------------------------------------------------------------

interface AddTagInlineProps {
  onAdd: (tag: Tag) => void;
  onCancel: () => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function AddTagInline({
  onAdd,
  onCancel,
  keyPlaceholder = "标签类型",
  valuePlaceholder = "值",
}: AddTagInlineProps) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  function confirm() {
    const trimmedKey = key.trim();
    if (!trimmedKey) { onCancel(); return; }
    onAdd(makeTag(trimmedKey, value.trim()));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); confirm(); }
    if (e.key === "Escape") onCancel();
  }

  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
      <input
        autoFocus
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={keyPlaceholder}
        className="w-14 text-xs bg-transparent outline-none text-blue-700 placeholder:text-blue-300"
      />
      <span className="text-blue-300 text-xs">:</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={valuePlaceholder}
        className="w-14 text-xs bg-transparent outline-none text-blue-700 placeholder:text-blue-300"
      />
      <button
        type="button"
        onClick={confirm}
        className="text-green-600 hover:text-green-700 flex-shrink-0"
        title="确认"
      >
        <Check size={10} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        title="取消"
      >
        <X size={10} />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// AttributeTagRow — tag strip with inline add
// ---------------------------------------------------------------------------

interface Props {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
  addLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  className?: string;
}

export function AttributeTagRow({
  tags: tagsProp,
  onChange,
  addLabel = "标签",
  keyPlaceholder,
  valuePlaceholder,
  className = "",
}: Props) {
  const tags = Array.isArray(tagsProp) ? tagsProp : [];
  const [showAdd, setShowAdd] = useState(false);

  function updateTag(id: string, updated: Tag) {
    onChange(tags.map((t) => (t.id === id ? updated : t)));
  }

  function deleteTag(id: string) {
    onChange(tags.filter((t) => t.id !== id));
  }

  function addTag(tag: Tag) {
    onChange([...tags, tag]);
    setShowAdd(false);
  }

  return (
    <div className={`flex flex-wrap gap-1.5 items-center ${className}`}>
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          onUpdate={(updated) => updateTag(tag.id, updated)}
          onDelete={() => deleteTag(tag.id)}
        />
      ))}

      {showAdd ? (
        <AddTagInline
          onAdd={addTag}
          onCancel={() => setShowAdd(false)}
          keyPlaceholder={keyPlaceholder}
          valuePlaceholder={valuePlaceholder}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-150 rounded-full px-2 py-0.5 transition-colors"
        >
          <Plus size={10} />
          {addLabel}
        </button>
      )}
    </div>
  );
}
