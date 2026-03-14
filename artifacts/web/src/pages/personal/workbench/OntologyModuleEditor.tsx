import React, { useState, useEffect } from "react";
import { CheckCircle2, Pencil } from "lucide-react";
import type { OntologyModule } from "@/types/workbench";
import type { OntologyModuleStructuredData } from "@/types/ontologyModules";
import { useWorkbench } from "@/contexts/WorkbenchContext";

// View components (inherited / confirmed state)
import { SystemModuleView } from "./modules/SystemModuleView";
import { PreparationModuleView } from "./modules/PreparationModuleView";
import { OperationModuleView } from "./modules/OperationModuleView";
import { MeasurementModuleView } from "./modules/MeasurementModuleView";
import { DataModuleView } from "./modules/DataModuleView";

// Structured editor components (editing state — priority 3)
import { SystemModuleEditor } from "./modules/SystemModuleEditor";
import { OperationModuleEditor } from "./modules/OperationModuleEditor";
import { MeasurementModuleEditor } from "./modules/MeasurementModuleEditor";

// ---------------------------------------------------------------------------
// Structured view dispatcher
// ---------------------------------------------------------------------------

/**
 * Selects the correct read-only view panel based on module.key.
 * Falls back to a pre-wrap text block when structuredData is absent.
 */
function StructuredModuleView({
  module,
  onAdd,
}: {
  module: OntologyModule;
  onAdd: () => void;
}) {
  const sd = module.structuredData;

  if (module.key === "system") {
    return <SystemModuleView objects={sd?.systemObjects ?? []} onAdd={onAdd} />;
  }
  if (module.key === "preparation") {
    return <PreparationModuleView items={sd?.prepItems ?? []} onAdd={onAdd} />;
  }
  if (module.key === "operation") {
    return <OperationModuleView steps={sd?.operationSteps ?? []} onAdd={onAdd} />;
  }
  if (module.key === "measurement") {
    return <MeasurementModuleView items={sd?.measurementItems ?? []} onAdd={onAdd} />;
  }
  if (module.key === "data") {
    return <DataModuleView items={sd?.dataItems ?? []} onAdd={onAdd} />;
  }
  return (
    <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
      {module.content || (
        <span className="text-gray-300 italic">暂无内容，点击"编辑"填写</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Structured editor dispatcher (editing state)
// ---------------------------------------------------------------------------

/**
 * Selects the correct structured editor for the three priority modules.
 * For preparation / data, falls back to a plain textarea (lower priority).
 */
function StructuredModuleEditorBody({
  module,
  structuredDraft,
  textDraft,
  onChangeStructured,
  onChangeText,
}: {
  module: OntologyModule;
  structuredDraft: OntologyModuleStructuredData;
  textDraft: string;
  onChangeStructured: (data: OntologyModuleStructuredData) => void;
  onChangeText: (text: string) => void;
}) {
  if (module.key === "system") {
    return (
      <SystemModuleEditor
        objects={structuredDraft.systemObjects ?? []}
        onChange={(objects) => onChangeStructured({ ...structuredDraft, systemObjects: objects })}
      />
    );
  }
  if (module.key === "operation") {
    return (
      <OperationModuleEditor
        steps={structuredDraft.operationSteps ?? []}
        onChange={(steps) => onChangeStructured({ ...structuredDraft, operationSteps: steps })}
      />
    );
  }
  if (module.key === "measurement") {
    return (
      <MeasurementModuleEditor
        items={structuredDraft.measurementItems ?? []}
        onChange={(items) => onChangeStructured({ ...structuredDraft, measurementItems: items })}
      />
    );
  }

  // preparation / data — textarea fallback (scheduled for next phase)
  return (
    <textarea
      value={textDraft}
      onChange={(e) => onChangeText(e.target.value)}
      className="w-full h-full min-h-[200px] px-4 py-3 text-sm text-gray-700 leading-relaxed resize-none outline-none bg-amber-50 border-0 font-mono"
      placeholder="输入模块内容…"
      autoFocus
    />
  );
}

// ---------------------------------------------------------------------------
// OntologyModuleEditor
// ---------------------------------------------------------------------------

interface Props {
  module: OntologyModule;
}

/**
 * OntologyModuleEditor — displays and edits a single ontology module.
 *
 * State machine (per-module):
 *   inherited → confirmed  (直接确认，不编辑)
 *   inherited → editing    (先编辑后确认)
 *   editing   → confirmed  (保存并确认)
 *   editing   → inherited  (取消，内容恢复)
 *   confirmed → editing    (再次编辑)
 *
 * Editing state (3 priority modules):
 *   实验系统 / 实验操作 / 测量过程 → structured card-form editors that match
 *   the wizard's visual language (ItemCard + ItemField + AttachmentArea).
 *   Results are committed to module.structuredData on confirm.
 *
 *   实验准备 / 实验数据 → textarea fallback (next implementation phase).
 *
 * View state (inherited / confirmed):
 *   All 5 modules → structured card/list views via StructuredModuleView.
 */
export function OntologyModuleEditor({ module }: Props) {
  const { updateModuleContent, updateModuleStructuredData, setModuleStatus } =
    useWorkbench();

  // Plain-text draft (used by preparation / data textarea fallback)
  const [textDraft, setTextDraft] = useState(module.content);

  // Structured draft (used by the 3 priority editors)
  const [structuredDraft, setStructuredDraft] =
    useState<OntologyModuleStructuredData>(() => module.structuredData ?? {});

  // Sync both drafts when the active module changes
  useEffect(() => {
    setTextDraft(module.content);
    setStructuredDraft(module.structuredData ?? {});
  }, [module.key, module.content, module.structuredData]);

  const isEditing   = module.status === "editing";
  const isConfirmed = module.status === "confirmed";
  const isInherited = module.status === "inherited";

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleEditClick() {
    setModuleStatus(module.key, "editing");
  }

  function handleEditConfirm() {
    // Commit text draft (for textarea modules)
    updateModuleContent(module.key, textDraft);
    // Commit structured draft (for all modules — no-op if structuredDraft is {})
    updateModuleStructuredData(module.key, structuredDraft);
    setModuleStatus(module.key, "confirmed");
  }

  function handleDirectConfirm() {
    setModuleStatus(module.key, "confirmed");
  }

  function handleCancelEdit() {
    // Roll back both drafts to the last persisted state
    setTextDraft(module.content);
    setStructuredDraft(module.structuredData ?? {});
    setModuleStatus(module.key, "inherited");
  }

  function handleReEdit() {
    setModuleStatus(module.key, "editing");
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={[
        "flex flex-col h-full",
        module.isHighlighted ? "ring-2 ring-amber-300 ring-inset" : "",
      ].join(" ")}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">{module.title}</h3>
          {module.isHighlighted && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
              AI 关联
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isConfirmed && (
            <>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={13} />
                已确认
              </span>
              <button
                onClick={handleReEdit}
                className="text-xs text-gray-300 hover:text-gray-600 transition-colors ml-1"
                title="重新编辑"
              >
                <Pencil size={11} />
              </button>
            </>
          )}

          {isEditing && (
            <>
              <button
                onClick={handleCancelEdit}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1.5 py-0.5 rounded"
              >
                取消
              </button>
              <button
                onClick={handleEditConfirm}
                className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded hover:bg-gray-700 transition-colors font-medium"
              >
                确认
              </button>
            </>
          )}

          {isInherited && (
            <>
              <button
                onClick={handleEditClick}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Pencil size={12} />
                编辑
              </button>
              <button
                onClick={handleDirectConfirm}
                className="text-xs border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800 px-2 py-0.5 rounded transition-colors"
              >
                确认
              </button>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Content                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={[
          "flex-1 overflow-y-auto",
          isEditing   ? "bg-amber-50/40" : "",
          isConfirmed ? "bg-white"       : "",
          isInherited ? "bg-gray-50"     : "",
        ].join(" ")}
      >
        {isEditing ? (
          <StructuredModuleEditorBody
            module={module}
            structuredDraft={structuredDraft}
            textDraft={textDraft}
            onChangeStructured={setStructuredDraft}
            onChangeText={setTextDraft}
          />
        ) : (
          <StructuredModuleView module={module} onAdd={handleEditClick} />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer badge                                                        */}
      {/* ------------------------------------------------------------------ */}
      {isInherited && (
        <div className="px-4 py-1.5 border-t border-gray-100 bg-white flex-shrink-0">
          <span className="text-xs text-gray-300">继承自本体版本，尚未确认</span>
        </div>
      )}
    </div>
  );
}
