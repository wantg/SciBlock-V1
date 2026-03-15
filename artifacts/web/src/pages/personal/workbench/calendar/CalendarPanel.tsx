/**
 * CalendarPanel — full calendar panel for the UtilityRail.
 *
 * Layer: Component (consumes WorkbenchContext for sciNoteId + switchRecord;
 *        uses useCalendarPanel hook for state; composes sub-components).
 *
 * Layout:
 *   ┌──────────────────────────┐
 *   │  CalendarGrid            │  ← month view with coloured dots
 *   ├──────────────────────────┤
 *   │  Legend                  │  ← status colour key
 *   ├──────────────────────────┤
 *   │  RecordDayList           │  ← when a date is selected
 *   │    OR                    │
 *   │  RecentRecords           │  ← default (no selection)
 *   └──────────────────────────┘
 */

import React from "react";
import { useLocation } from "wouter";
import { RefreshCw } from "lucide-react";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { useCalendarPanel } from "./useCalendarPanel";
import { CalendarGrid } from "./CalendarGrid";
import { RecordDayList } from "./RecordDayList";
import { RecentRecords } from "./RecentRecords";
import { STATUS_DOT_CLASS } from "@/types/calendarPanel";
import type { ExperimentStatus } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

const LEGEND_ITEMS: Array<{ status: ExperimentStatus; label: string }> = [
  { status: "探索中", label: "探索中" },
  { status: "可复现", label: "可复现" },
  { status: "已验证", label: "已验证" },
  { status: "失败",   label: "失败"   },
];

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {LEGEND_ITEMS.map(({ status, label }) => (
        <div key={status} className="flex items-center gap-1">
          <span className={["w-1.5 h-1.5 rounded-full", STATUS_DOT_CLASS[status]].join(" ")} />
          <span className="text-[10px] text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CalendarPanel
// ---------------------------------------------------------------------------

interface Props {
  isOpen: boolean;
}

export function CalendarPanel({ isOpen }: Props) {
  const { currentRecord, switchRecord, records } = useWorkbench();
  const [, navigate] = useLocation();

  const state = useCalendarPanel(isOpen, records, currentRecord.sciNoteId);

  // ── Navigation handler ─────────────────────────────────────────────────
  function handleNavigate(sciNoteId: string, recordId: string) {
    const isSameNote = sciNoteId === currentRecord.sciNoteId;
    if (isSameNote) {
      // Stay in current workbench, just switch the active record tab
      switchRecord(recordId);
    } else {
      // Navigate to the other SciNote's workbench
      navigate(`/personal/experiment/${sciNoteId}/workbench`);
    }
  }

  // ── Date string → Date converter for RecentRecords clicks ─────────────
  function handleSelectDateStr(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    state.selectDate(new Date(y, m - 1, d));
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Panel title + refresh */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-700">实验日历</span>
        <button
          onClick={state.refresh}
          title="刷新"
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4 min-h-0">
        {/* Calendar grid */}
        <CalendarGrid
          currentMonth={state.currentMonth}
          selectedDate={state.selectedDate}
          dateMap={state.dateMap}
          onPrevMonth={state.prevMonth}
          onNextMonth={state.nextMonth}
          onSelectDate={state.selectDate}
        />

        {/* Legend */}
        <div className="border-t border-gray-100 pt-3">
          <Legend />
        </div>

        {/* Content: day list or recent list */}
        <div className="border-t border-gray-100 pt-3">
          {state.selectedDate && state.selectedDateStr ? (
            <RecordDayList
              dateStr={state.selectedDateStr}
              records={state.selectedRecords}
              currentSciNoteId={currentRecord.sciNoteId}
              onNavigate={handleNavigate}
              onClear={() => state.selectDate(null)}
            />
          ) : (
            <RecentRecords
              recentDays={state.recentDays}
              onNavigate={handleNavigate}
              onSelectDate={handleSelectDateStr}
            />
          )}
        </div>
      </div>
    </div>
  );
}
