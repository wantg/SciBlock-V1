import React from "react";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { ExperimentHeader } from "./ExperimentHeader";
import { OntologyModuleNav } from "./OntologyModuleNav";
import { OntologyModuleEditor } from "./OntologyModuleEditor";

/**
 * OntologyPanel — left panel of the experiment workbench.
 *
 * Structure:
 *   ┌──────────────────────────┐
 *   │   ExperimentHeader       │  title / status / tags / AI assist
 *   ├──────────────────────────┤
 *   │   OntologyModuleNav      │  tab row for the 5 modules
 *   ├──────────────────────────┤
 *   │   OntologyModuleEditor   │  content + edit + confirm for active module
 *   └──────────────────────────┘
 */
export function OntologyPanel() {
  const { currentRecord, activeModuleKey, setActiveModuleKey } = useWorkbench();

  const activeModule = currentRecord.currentModules.find(
    (m) => m.key === activeModuleKey,
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border-r border-gray-100 overflow-hidden">
      <ExperimentHeader />

      <OntologyModuleNav
        modules={currentRecord.currentModules}
        activeKey={activeModuleKey}
        onSelect={setActiveModuleKey}
      />

      <div className="flex-1 overflow-hidden">
        {activeModule ? (
          <OntologyModuleEditor key={activeModule.key} module={activeModule} />
        ) : (
          <div className="p-4 text-sm text-gray-400">未找到模块</div>
        )}
      </div>
    </div>
  );
}
