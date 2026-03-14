import React, { useState } from "react";
import { X, Plus, Check, Tag as TagIcon } from "lucide-react";
import type { ObjectItem, Tag } from "@/types/experimentFields";
import { makeTag } from "@/types/experimentFields";
import { TagBadge } from "@/components/ui/TagBadge";

interface Props {
  item: ObjectItem;
  onChange: (updated: ObjectItem) => void;
  onDelete: () => void;
}

/**
 * ObjectItemCard — represents a single named entity with attribute tags.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────┐
 *   │ [name input — borderless, semibold]     [× del] │
 *   │ ◇ 属性标签                                      │
 *   │ [tag1] [tag2] … [+ 标签]                        │
 *   └────────────────────────────────────────────────┘
 */
export function ObjectItemCard({ item, onChange, onDelete }: Props) {
  const [showAddTag, setShowAddTag] = useState(false);
  const [addTagKey, setAddTagKey] = useState("");
  const [addTagValue, setAddTagValue] = useState("");

  // ------ tag helpers ------

  function updateTag(id: string, updated: Tag) {
    onChange({ ...item, tags: item.tags.map((t) => (t.id === id ? updated : t)) });
  }

  function deleteTag(id: string) {
    onChange({ ...item, tags: item.tags.filter((t) => t.id !== id) });
  }

  function confirmAddTag() {
    const key = addTagKey.trim();
    if (!key) return;
    onChange({ ...item, tags: [...item.tags, makeTag(key, addTagValue.trim())] });
    setAddTagKey("");
    setAddTagValue("");
    setShowAddTag(false);
  }

  function cancelAddTag() {
    setAddTagKey("");
    setAddTagValue("");
    setShowAddTag(false);
  }

  function handleAddTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") confirmAddTag();
    if (e.key === "Escape") cancelAddTag();
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 pt-3 pb-3 flex flex-col gap-2.5">
      {/* Name row */}
      <div className="flex items-start gap-2">
        <input
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          placeholder="对象名称…"
          className="flex-1 text-base font-semibold text-gray-800 bg-transparent outline-none placeholder:text-gray-300 leading-tight"
        />
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0"
          title="删除该项"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tags section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <TagIcon size={11} />
          <span>属性标签</span>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {item.tags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              onUpdate={(updated) => updateTag(tag.id, updated)}
              onDelete={() => deleteTag(tag.id)}
            />
          ))}

          {showAddTag ? (
            <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
              <input
                autoFocus
                value={addTagKey}
                onChange={(e) => setAddTagKey(e.target.value)}
                onKeyDown={handleAddTagKeyDown}
                placeholder="标签类型"
                className="w-14 text-xs bg-transparent outline-none text-blue-700 placeholder:text-blue-300"
              />
              <span className="text-blue-300 text-xs">:</span>
              <input
                value={addTagValue}
                onChange={(e) => setAddTagValue(e.target.value)}
                onKeyDown={handleAddTagKeyDown}
                placeholder="值"
                className="w-14 text-xs bg-transparent outline-none text-blue-700 placeholder:text-blue-300"
              />
              <button
                onClick={confirmAddTag}
                className="text-green-600 hover:text-green-700"
                title="确认"
              >
                <Check size={10} />
              </button>
              <button
                onClick={cancelAddTag}
                className="text-gray-400 hover:text-gray-600"
                title="取消"
              >
                <X size={10} />
              </button>
            </span>
          ) : (
            <button
              onClick={() => setShowAddTag(true)}
              className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-150 rounded-full px-2 py-0.5 transition-colors"
            >
              <Plus size={10} />
              标签
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
