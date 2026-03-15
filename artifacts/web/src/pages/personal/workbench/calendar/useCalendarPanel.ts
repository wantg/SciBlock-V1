/**
 * useCalendarPanel — business logic hook for the UtilityRail calendar panel.
 *
 * Layer: Business logic (no UI, no direct storage or API calls).
 *
 * Responsibilities:
 *   - Derive the date→record index from ExperimentRecord[] provided by WorkbenchContext
 *   - Manage selected date + current month navigation state
 *   - Derive selectedRecords and recentDays for rendering
 *
 * Data source: records are passed in from WorkbenchContext (the authoritative
 * in-memory state). The calendar reacts automatically when records change —
 * no manual refresh against storage is needed.
 */

import { useState, useMemo, useCallback } from "react";
import {
  buildCalendarRecordMap,
  getRecentDays,
} from "@/api/calendarRecords";
import type { CalendarRecord, DateRecordMap } from "@/types/calendarPanel";
import type { ExperimentRecord } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface CalendarPanelState {
  dateMap:         DateRecordMap;
  selectedDate:    Date | null;
  selectedDateStr: string | null;
  selectedRecords: CalendarRecord[];
  currentMonth:    Date;
  recentDays:      Array<{ dateStr: string; records: CalendarRecord[] }>;
  markedDates:     Set<string>;
  // actions
  selectDate:      (d: Date | null) => void;
  prevMonth:       () => void;
  nextMonth:       () => void;
  refresh:         () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @param isOpen    Whether the calendar panel is currently visible.
 * @param records   ExperimentRecord[] from WorkbenchContext. The dateMap
 *                  updates automatically whenever this array changes.
 * @param sciNoteId The SciNote that owns the records.
 */
export function useCalendarPanel(
  isOpen: boolean,
  records: ExperimentRecord[],
  sciNoteId: string,
): CalendarPanelState {
  const [selectedDate, setSelected] = useState<Date | null>(null);
  const [currentMonth, setMonth]    = useState<Date>(() => startOfMonth(new Date()));

  // Derived from WorkbenchContext records — updates automatically on every
  // records change. No storage read required.
  const dateMap = useMemo(
    () => buildCalendarRecordMap(records, sciNoteId),
    [records, sciNoteId],
  );

  // Kept in the public interface for backwards compatibility and UI affordance.
  // With reactive dateMap, no manual storage reload is needed.
  const refresh = useCallback(() => {
    // no-op: dateMap is derived from context state and updates automatically.
  }, []);

  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : null;
  const selectedRecords = selectedDateStr
    ? (dateMap.get(selectedDateStr) ?? [])
    : [];

  const recentDays = getRecentDays(dateMap, 5);
  const markedDates = new Set(dateMap.keys());

  function selectDate(d: Date | null) {
    setSelected(d);
    if (d) setMonth(startOfMonth(d));
  }

  function prevMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  function nextMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  // Suppress unused-variable warning — isOpen is kept for symmetry with
  // future use (e.g. reset selection on close).
  void isOpen;

  return {
    dateMap,
    selectedDate,
    selectedDateStr,
    selectedRecords,
    currentMonth,
    recentDays,
    markedDates,
    selectDate,
    prevMonth,
    nextMonth,
    refresh,
  };
}
