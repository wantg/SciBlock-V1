import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { OntologyPanel } from "./OntologyPanel";
import { EditorPanel } from "./EditorPanel";
import { UtilityRail } from "./UtilityRail";
import type { WorkbenchFocusMode } from "@/types/workbench";

// Focus mode → OntologyPanel percentage width
const ONTOLOGY_WIDTH: Record<WorkbenchFocusMode, string> = {
  ontology: "48%",
  balanced: "34%",
  editor: "20%",
};

/**
 * FocusDivider — the thin strip between OntologyPanel and EditorPanel.
 * Two chevron buttons let the user shift the layout focus left or right.
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
 * WorkbenchLayout — three-panel layout:
 *   OntologyPanel | FocusDivider | EditorPanel | UtilityRail
 *
 * OntologyPanel width changes with focusMode.
 * UtilityRail is always fixed and does not participate in focus adjustments.
 */
export function WorkbenchLayout() {
  const { focusMode } = useWorkbench();

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: Ontology panel — width controlled by focusMode */}
      <div
        style={{ width: ONTOLOGY_WIDTH[focusMode] }}
        className="flex-shrink-0 transition-[width] duration-200 ease-in-out min-h-0"
      >
        <OntologyPanel />
      </div>

      {/* Divider with focus arrows */}
      <FocusDivider />

      {/* Middle: Editor panel — takes remaining space */}
      <div className="flex-1 min-w-0 min-h-0">
        <EditorPanel />
      </div>

      {/* Right: Utility rail — always fixed */}
      <UtilityRail />
    </div>
  );
}
