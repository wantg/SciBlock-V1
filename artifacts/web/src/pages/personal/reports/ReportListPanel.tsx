import React from "react";
import { Plus } from "lucide-react";
import { ReportStatusTag } from "@/components/reports/ReportStatusTag";
import type { WeeklyReport } from "@/types/weeklyReport";
import { fmtWeekRange, fmtDate } from "@/types/weeklyReport";

interface Props {
  reports: WeeklyReport[];
  selectedId: string | null;
  onSelect: (report: WeeklyReport) => void;
  onNew: () => void;
  loading: boolean;
}

export function ReportListPanel({ reports, selectedId, onSelect, onNew, loading }: Props) {
  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">周报列表</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors rounded px-1.5 py-1 hover:bg-gray-100"
        >
          <Plus size={13} />
          新建
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-gray-400">加载中…</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
            <p className="text-sm text-gray-400">还没有周报</p>
            <button
              onClick={onNew}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              新建本周周报
            </button>
          </div>
        ) : (
          <div className="py-1">
            {reports.map((r) => {
              const active = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className={[
                    "w-full text-left px-4 py-3 border-b border-gray-50 transition-colors",
                    active ? "bg-blue-50" : "hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">
                      {fmtDate(r.weekStart)} – {r.weekEnd ? fmtDate(r.weekEnd) : "?"}
                    </span>
                    <ReportStatusTag status={r.status} />
                  </div>
                  <p className={`text-sm truncate ${active ? "text-blue-900 font-medium" : "text-gray-800"}`}>
                    {r.title}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
