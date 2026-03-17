import React from "react";
import { ChevronLeft, ChevronRight, FlaskConical } from "lucide-react";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { RecordSwitcher } from "./RecordSwitcher";
import { OntologyPanel } from "./OntologyPanel";
import { EditorPanel } from "./EditorPanel";
import { UtilityRail } from "./UtilityRail";
import type { WorkbenchFocusMode } from "@/types/workbench";

// Focus mode → OntologyPanel percentage width
const ONTOLOGY_WIDTH: Record<WorkbenchFocusMode, string> = {
  ontology: "48%",
  balanced: "34%",
  editor:   "20%",
};

/**
 * FocusDivider — thin vertical strip between OntologyPanel and EditorPanel.
 * Two chevrons shift focus left (expand editor) or right (expand ontology).
 */
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
 * ExperimentInfoBar — slim context strip shown between RecordSwitcher and the
 * three-panel area.  Always rendered inside the workbench.
 *
 * Layout:
 *   项目 <sciNoteTitle>  [·  🔬 experimentType]  [·  目标: objective]
 *
 * The project label is always visible so users know which SciNote they are in.
 * experimentType and objective appear only when set.
 */
function ExperimentInfoBar() {
  const { sciNoteTitle, experimentType, objective } = useWorkbench();

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50 border-b border-gray-100 min-h-0 flex-shrink-0">
      {/* Project label — always visible */}
      <span className="flex items-center gap-1.5 flex-shrink-0 min-w-0 max-w-[180px]">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex-shrink-0">
          项目
        </span>
        <span
          className="text-xs font-medium text-gray-700 truncate"
          title={sciNoteTitle}
        >
          {sciNoteTitle || "—"}
        </span>
      </span>

      {/* Divider — only when more metadata follows */}
      {(experimentType || objective) && (
        <span className="text-gray-200 text-xs flex-shrink-0">·</span>
      )}

      {/* Experiment type badge */}
      {experimentType && (
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <FlaskConical size={11} className="text-violet-400" />
          <span className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5 leading-none">
            {experimentType}
          </span>
        </span>
      )}

      {/* Divider — only when objective follows type */}
      {experimentType && objective && (
        <span className="text-gray-200 text-xs flex-shrink-0">·</span>
      )}

      {/* Objective (truncated, native tooltip for full text) */}
      {objective && (
        <span
          title={objective}
          className="flex-1 min-w-0 text-xs text-gray-500 truncate"
        >
          <span className="text-gray-400 mr-1">目标：</span>
          {objective}
        </span>
      )}
    </div>
  );
}

/**
 * WorkbenchLayout — full page layout inside WorkbenchProvider.
 *
 *   [RecordSwitcher — full width tab bar]
 *   [ExperimentInfoBar — slim metadata strip, only when data exists]
 *   [OntologyPanel | FocusDivider | EditorPanel | UtilityRail]
 *
 * OntologyPanel width is controlled by focusMode.
 * UtilityRail is always fixed and unaffected by focus changes.
 */
export function WorkbenchLayout() {
  const { focusMode } = useWorkbench();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Record switcher spans the full width above the info bar and panels */}
      <RecordSwitcher />

      {/* Context bar — always visible: project name + optional experiment metadata */}
      <ExperimentInfoBar />

      {/* Three-panel area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: ontology panel */}
        <div
          style={{ width: ONTOLOGY_WIDTH[focusMode] }}
          className="flex-shrink-0 transition-[width] duration-200 ease-in-out min-h-0"
        >
          <OntologyPanel />
        </div>

        {/* Divider with focus arrows */}
        <FocusDivider />

        {/* Middle: editor — takes remaining space */}
        <div className="flex-1 min-w-0 min-h-0">
          <EditorPanel />
        </div>

        {/* Right: utility rail — always fixed */}
        <UtilityRail />
      </div>
    </div>
  );
}
