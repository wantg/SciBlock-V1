import React from "react";
import { Plus } from "lucide-react";
import type { ObjectItem } from "@/types/experimentFields";
import { makeObjectItem } from "@/types/experimentFields";
import { ObjectItemCard } from "./ObjectItemCard";

interface Props {
  objects: ObjectItem[];
  onChange: (objects: ObjectItem[]) => void;
}

/**
 * ObjectField — the body content for an "object" type field category.
 *
 * Renders a list of ObjectItemCards (each with name + attribute tags)
 * plus a "新增对象项" button to append a new blank item.
 */
export function ObjectField({ objects, onChange }: Props) {
  function updateItem(id: string, updated: ObjectItem) {
    onChange(objects.map((o) => (o.id === id ? updated : o)));
  }

  function deleteItem(id: string) {
    onChange(objects.filter((o) => o.id !== id));
  }

  function addItem() {
    onChange([...objects, makeObjectItem()]);
  }

  return (
    <div className="flex flex-col gap-2">
      {objects.length === 0 && (
        <p className="text-xs text-gray-300 py-1">暂无对象项，点击下方按钮添加</p>
      )}

      {objects.map((item) => (
        <ObjectItemCard
          key={item.id}
          item={item}
          onChange={(updated) => updateItem(item.id, updated)}
          onDelete={() => deleteItem(item.id)}
        />
      ))}

      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors py-1"
      >
        <Plus size={12} />
        新增对象项
      </button>
    </div>
  );
}
