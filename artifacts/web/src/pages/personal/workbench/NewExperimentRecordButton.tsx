import React from "react";
import { Plus } from "lucide-react";
import { useWorkbench } from "@/contexts/WorkbenchContext";

/**
 * NewExperimentRecordButton — creates a new experiment record that inherits
 * the latest ontology version, resets editor and title, and switches to it.
 */
export function NewExperimentRecordButton() {
  const { createNewRecord, records, currentRecord } = useWorkbench();

  return (
    <div className="flex items-center gap-2">
      {records.length > 1 && (
        <span className="text-xs text-gray-400">
          记录 {records.findIndex((r) => r.id === currentRecord.id) + 1} / {records.length}
        </span>
      )}
      <button
        onClick={createNewRecord}
        title="新建实验记录"
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-md px-2 py-1 transition-colors"
      >
        <Plus size={12} />
        新建记录
      </button>
    </div>
  );
}
