/**
 * OntologyModuleEditor — orchestrates a single ontology module.
 *
 * Architecture change (item-level inline editing):
 *  - Module body is ALWAYS visible — no editing-state gate on content.
 *  - Per-item editing is handled inside each module editor component.
 *  - Writes from item editors go directly to updateModuleStructuredData
 *    on each item save — no module-level draft accumulation.
 *  - Module header only controls the inherited → confirmed status annotation.
 *    "确认" = "I've reviewed this module". Item editing is independent of status.
 *
 * Module dispatch:
 *   实验系统    → SystemModuleEditor
 *   实验准备    → PreparationModuleEditor
 *   实验操作    → OperationModuleEditor
 *   测量过程    → MeasurementModuleEditor
 *   实验数据    → DataModuleView (view + inline add, next phase for full editor)
 */

import React from "react";
import { CheckCircle2, Pencil } from "lucide-react";
import type { OntologyModule } from "@/types/workbench";
import type { OntologyModuleStructuredData } from "@/types/ontologyModules";
import { useWorkbench } from "@/contexts/WorkbenchContext";

import { SystemModuleEditor } from "./modules/SystemModuleEditor";
import { PreparationModuleEditor } from "./modules/PreparationModuleEditor";
import { OperationModuleEditor } from "./modules/OperationModuleEditor";
import { MeasurementModuleEditor } from "./modules/MeasurementModuleEditor";
import { DataModuleView } from "./modules/DataModuleView";

// ---------------------------------------------------------------------------
// Module content dispatcher
// ---------------------------------------------------------------------------

interface BodyProps {
  module: OntologyModule;
  /** Incremental updater — merges into module.structuredData and persists. */
  onUpdate: (patch: Partial<OntologyModuleStructuredData>) => void;
}

function ModuleBody({ module, onUpdate }: BodyProps) {
  const sd = module.structuredData ?? {};

  switch (module.key) {
    case "system":
      return (
        <SystemModuleEditor
          objects={sd.systemObjects ?? []}
          onUpdate={(objects) => onUpdate({ systemObjects: objects })}
        />
      );
    case "preparation":
      return (
        <PreparationModuleEditor
          items={sd.prepItems ?? []}
          onUpdate={(items) => onUpdate({ prepItems: items })}
        />
      );
    case "operation":
      return (
        <OperationModuleEditor
          steps={sd.operationSteps ?? []}
          onUpdate={(steps) => onUpdate({ operationSteps: steps })}
        />
      );
    case "measurement":
      return (
        <MeasurementModuleEditor
          items={sd.measurementItems ?? []}
          onUpdate={(items) => onUpdate({ measurementItems: items })}
        />
      );
    case "data":
      return (
        <DataModuleView
          items={sd.dataItems ?? []}
          onAdd={() => {
            /* DataModuleEditor planned for next phase */
          }}
        />
      );
    default:
      return (
        <div className="px-4 py-3 text-sm text-gray-400 italic">
          模块内容暂未配置
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// OntologyModuleEditor
// ---------------------------------------------------------------------------

interface Props {
  module: OntologyModule;
}

export function OntologyModuleEditor({ module }: Props) {
  const { updateModuleStructuredData, setModuleStatus } = useWorkbench();

  const isConfirmed = module.status === "confirmed";
  const isInherited = module.status === "inherited";

  /**
   * Incremental write: merges patch into current structuredData, then
   * persists via context. This is the only write path — no module-level
   * draft means no stale-closure overwrite risk.
   */
  function handleUpdate(patch: Partial<OntologyModuleStructuredData>) {
    const sd = module.structuredData ?? {};
    updateModuleStructuredData(module.key, { ...sd, ...patch });
  }

  function handleConfirm() {
    setModuleStatus(module.key, "confirmed");
  }

  function handleReopen() {
    setModuleStatus(module.key, "inherited");
  }

  return (
    <div
      className={[
        "flex flex-col h-full",
        module.isHighlighted ? "ring-2 ring-amber-300 ring-inset" : "",
      ].join(" ")}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header — module title + status annotation                           */}
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
          {isConfirmed ? (
            <>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={13} />
                已确认
              </span>
              <button
                onClick={handleReopen}
                className="text-gray-300 hover:text-gray-600 transition-colors ml-1 p-0.5 rounded"
                title="撤销确认，继续编辑"
              >
                <Pencil size={11} />
              </button>
            </>
          ) : (
            <button
              onClick={handleConfirm}
              className="text-xs border border-gray-200 text-gray-500 hover:border-gray-800 hover:text-gray-900 px-2.5 py-1 rounded transition-colors"
            >
              确认
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Body — always visible, per-item editing handled inside              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <ModuleBody module={module} onUpdate={handleUpdate} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer — inherited hint                                             */}
      {/* ------------------------------------------------------------------ */}
      {isInherited && (
        <div className="px-4 py-1.5 border-t border-gray-100 bg-white flex-shrink-0">
          <span className="text-xs text-gray-300">继承自本体版本，尚未确认</span>
        </div>
      )}
    </div>
  );
}
