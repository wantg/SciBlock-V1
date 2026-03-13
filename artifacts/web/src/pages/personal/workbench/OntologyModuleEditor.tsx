import React, { useState, useEffect } from "react";
import { CheckCircle2, Pencil } from "lucide-react";
import type { OntologyModule } from "@/types/workbench";
import { useWorkbench } from "@/contexts/WorkbenchContext";

interface Props {
  module: OntologyModule;
}

/**
 * OntologyModuleEditor — displays and edits a single ontology module.
 *
 * States:
 *   inherited → shows content in read-only view, edit button visible
 *   editing   → shows textarea for editing
 *   confirmed → shows content in read-only view, confirmed badge
 *
 * Highlight: when isHighlighted=true, the card gets a faint amber ring
 * to indicate it was flagged as relevant by the AI title assist.
 */
export function OntologyModuleEditor({ module }: Props) {
  const { updateModuleContent, setModuleStatus } = useWorkbench();

  const [draft, setDraft] = useState(module.content);

  // Sync draft if the module content changes externally (e.g. new record)
  useEffect(() => {
    setDraft(module.content);
  }, [module.key, module.content]);

  function handleEditClick() {
    setModuleStatus(module.key, "editing");
  }

  function handleConfirm() {
    updateModuleContent(module.key, draft);
    setModuleStatus(module.key, "confirmed");
  }

  function handleCancelEdit() {
    setDraft(module.content);
    setModuleStatus(module.key, module.content ? "inherited" : "inherited");
  }

  const isEditing = module.status === "editing";
  const isConfirmed = module.status === "confirmed";

  return (
    <div
      className={[
        "flex flex-col h-full",
        module.isHighlighted ? "ring-2 ring-amber-300 ring-inset rounded-none" : "",
      ].join(" ")}
    >
      {/* Module header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">{module.title}</h3>
          {module.isHighlighted && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
              AI 关联
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 size={13} />
              已确认
            </span>
          ) : isEditing ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCancelEdit}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1.5 py-0.5 rounded"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded hover:bg-gray-700 transition-colors font-medium"
              >
                确认
              </button>
            </div>
          ) : (
            <button
              onClick={handleEditClick}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Pencil size={12} />
              编辑
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-full min-h-[200px] px-4 py-3 text-sm text-gray-700 leading-relaxed resize-none outline-none bg-amber-50 border-0 font-mono"
            placeholder="输入模块内容…"
            autoFocus
          />
        ) : (
          <div
            className={[
              "px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap h-full",
              isConfirmed ? "bg-white" : "bg-gray-50",
            ].join(" ")}
          >
            {module.content || (
              <span className="text-gray-300 italic">暂无内容，点击"编辑"填写</span>
            )}
          </div>
        )}
      </div>

      {/* Inherited badge */}
      {module.status === "inherited" && (
        <div className="px-4 py-1.5 border-t border-gray-100 bg-white flex-shrink-0">
          <span className="text-xs text-gray-300">继承自本体版本，尚未确认</span>
        </div>
      )}
    </div>
  );
}
