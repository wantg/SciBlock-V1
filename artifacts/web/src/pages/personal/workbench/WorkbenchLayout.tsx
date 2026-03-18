import React from "react";
import { ChevronLeft, ChevronRight, FlaskConical } from "lucide-react";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { RecordSwitcher } from "./RecordSwitcher";
import { OntologyPanel } from "./OntologyPanel";
import { EditorPanel } from "./EditorPanel";
import { UtilityRail } from "./UtilityRail";
import type { WorkbenchFocusMode } from "@/types/workbench";

const ONTOLOGY_WIDTH: Record<WorkbenchFocusMode, string> = {
  ontology: "48%",
  balanced: "34%",
  editor:   "20%",
};

function FocusDivider() {
  const { focusMode, setFocusMode } = useWorkbench();

  function shiftLeft() {
    if (focusMode === "ontology") setFocusMode("balanced");
    else if (focusMode === "balanced") setFocusMode("editor");
  }

  function shiftRight() {
    if (focusMode === "editor") setFocusMode("balanced");
    else if (focusMode === "balanced") setFocusMode("ontology");
  }

  return (
    <div className="flex-shrink-0 w-5 flex flex-col items-center justify-center gap-1 bg-white border-x border-gray-100 z-10">
      <button
        onClick={shiftLeft}
        disabled={focusMode === "editor"}
        title="扩展编辑区"
        className="p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={12} />
      </button>
      <button
        onClick={shiftRight}
        disabled={focusMode === "ontology"}
        title="扩展本体区"
        className="p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

/**
 * EmptyRecordsState — shown when a SciNote has no active experiment records.
 *
 * This happens when the user deletes all draft records (confirmed records
 * cannot be deleted, so if any existed this state is unreachable).
 * The user can create a fresh record from here.
 */
function EmptyRecordsState() {
  const { createNewRecord } = useWorkbench();
  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="text-center space-y-3 px-6">
        <FlaskConical className="w-10 h-10 text-gray-200 mx-auto" />
        <p className="text-sm font-medium text-gray-500">暂无实验记录</p>
        <p className="text-xs text-gray-400">当前 SciNote 还没有任何实验记录</p>
        <button
          onClick={createNewRecord}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs hover:bg-gray-700 transition-colors"
        >
          + 新建第一条实验记录
        </button>
      </div>
    </div>
  );
}

/**
 * WorkbenchLayout — full page layout inside WorkbenchProvider.
 *
 *   [RecordSwitcher — full width tab bar]
 *   [OntologyPanel | FocusDivider | EditorPanel | UtilityRail]
 *
 * When records is empty (all drafts deleted), renders EmptyRecordsState
 * below the switcher bar instead of the three-panel area.
 */
export function WorkbenchLayout() {
  const { focusMode, records } = useWorkbench();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <RecordSwitcher />

      {records.length === 0 ? (
        <EmptyRecordsState />
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div
            style={{ width: ONTOLOGY_WIDTH[focusMode] }}
            className="flex-shrink-0 transition-[width] duration-200 ease-in-out min-h-0"
          >
            <OntologyPanel />
          </div>

          <FocusDivider />

          <div className="flex-1 min-w-0 min-h-0">
            <EditorPanel />
          </div>

          <UtilityRail />
        </div>
      )}
    </div>
  );
}
