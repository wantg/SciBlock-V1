import React from "react";
import type { OntologyModule, OntologyModuleKey } from "@/types/workbench";

interface Props {
  modules: OntologyModule[];
  activeKey: OntologyModuleKey;
  onSelect: (key: OntologyModuleKey) => void;
}

/**
 * StatusDot — shows the "confirmation light" next to each module tab.
 *
 * Design intent (per spec):
 *   未确认 (inherited / editing) → lit amber dot   (needs attention)
 *   已确认 (confirmed)           → dim gray dot    (done, no action needed)
 */
function StatusDot({ status }: { status: OntologyModule["status"] }) {
  if (status === "confirmed") {
    return <span className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0" />;
  }
  if (status === "editing") {
    return (
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
    );
  }
  // inherited
  return <span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0" />;
}

/**
 * OntologyModuleNav — horizontal tab row at the top of the OntologyPanel.
 * Each tab shows the module title and a status dot indicator.
 */
export function OntologyModuleNav({ modules, activeKey, onSelect }: Props) {
  return (
    <div className="flex border-b border-gray-100 overflow-x-auto flex-shrink-0 bg-white">
      {modules.map((mod) => {
        const isActive = mod.key === activeKey;
        return (
          <button
            key={mod.key}
            onClick={() => onSelect(mod.key)}
            title={mod.title}
            className={[
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap",
              "border-b-2 transition-colors flex-shrink-0",
              isActive
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200",
            ].join(" ")}
          >
            <StatusDot status={mod.status} />
            <span>{mod.title}</span>
          </button>
        );
      })}
    </div>
  );
}
