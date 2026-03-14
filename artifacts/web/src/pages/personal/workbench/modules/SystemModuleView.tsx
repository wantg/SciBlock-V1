import React from "react";
import { Plus } from "lucide-react";
import type { SystemObject } from "@/types/ontologyModules";

interface Props {
  objects: SystemObject[];
  /** Called when the user clicks "+ 新增对象" to signal that editing should start. */
  onAdd: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  研究基底: "bg-blue-50 text-blue-700 border-blue-200",
  靶材:     "bg-violet-50 text-violet-700 border-violet-200",
  设备:     "bg-gray-100 text-gray-600 border-gray-200",
};

/**
 * SystemModuleView — card-per-object layout for the 实验系统 module.
 *
 * Each card shows: object name, role badge, attribute chips, optional description.
 * Rendered in inherited / confirmed view states (not in editing state).
 */
export function SystemModuleView({ objects, onAdd }: Props) {
  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      {/* Section label */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        研究对象
      </p>

      {/* Object cards */}
      {objects.map((obj) => (
        <div
          key={obj.id}
          className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 flex flex-col gap-1.5 shadow-sm"
        >
          {/* Name + role badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{obj.name}</span>
            <span
              className={[
                "text-[10px] font-medium border rounded px-1.5 py-0.5 leading-none",
                ROLE_COLORS[obj.role] ?? "bg-gray-100 text-gray-500 border-gray-200",
              ].join(" ")}
            >
              {obj.role}
            </span>
          </div>

          {/* Attribute chips — key:value tags */}
          {obj.attributes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {obj.attributes.map((tag) => (
                <span
                  key={tag.id}
                  className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5"
                >
                  {tag.value ? `${tag.key}: ${tag.value}` : tag.key}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {obj.description && (
            <p className="text-xs text-gray-400 leading-relaxed">{obj.description}</p>
          )}
        </div>
      ))}

      {/* Add entry */}
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400 hover:text-gray-500 transition-colors w-full justify-center"
      >
        <Plus size={12} />
        新增对象
      </button>
    </div>
  );
}
