import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true the confirm button is rendered in a destructive style */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmDialog — a lightweight modal used for confirming destructive or
 * significant actions. Rendered via createPortal so it sits above all other
 * content regardless of parent stacking context.
 *
 * Click the backdrop to cancel.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 max-w-sm w-full mx-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          {danger && (
            <AlertTriangle
              size={17}
              className="text-amber-500 flex-shrink-0 mt-0.5"
            />
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
              {title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={[
              "px-3.5 py-1.5 text-sm rounded-lg font-medium transition-colors cursor-pointer",
              danger
                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "bg-gray-900 text-white hover:bg-gray-800",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
