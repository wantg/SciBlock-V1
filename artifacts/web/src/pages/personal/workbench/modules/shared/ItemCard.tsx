import React from "react";
import { Trash2 } from "lucide-react";

interface ItemCardProps {
  /** Primary heading shown in the card header. */
  title: string;
  /** Optional secondary text (e.g. a role or category badge). */
  subtitle?: string;
  /** Show delete button in card header. */
  onDelete?: () => void;
  children: React.ReactNode;
}

/**
 * ItemCard — white card wrapper for a single structured item in editing mode.
 *
 * Mirrors the wizard's FieldCard visual language:
 *   - Outer: `bg-white border border-gray-100 rounded-xl overflow-hidden`
 *   - Header: `bg-gray-50/60` with title and optional delete action
 *   - Body: `px-4 py-3 flex flex-col gap-3`
 */
export function ItemCard({ title, subtitle, onDelete, children }: ItemCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-700 truncate">{title}</span>
          {subtitle && (
            <span className="text-xs text-gray-400 flex-shrink-0">{subtitle}</span>
          )}
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
            title="删除该条目"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-3">{children}</div>
    </div>
  );
}
