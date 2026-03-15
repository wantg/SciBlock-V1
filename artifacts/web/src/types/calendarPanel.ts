/**
 * calendarPanel.ts — type definitions for the UtilityRail calendar panel.
 *
 * Layer: Type definitions — no runtime logic.
 *
 * Kept separate from workbench.ts so the calendar feature can grow
 * independently (filters, range-select, export, etc.).
 */

import type { ExperimentStatus } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Core record shape as seen by the calendar panel
// ---------------------------------------------------------------------------

/**
 * Lightweight representation of an experiment record used by the calendar.
 * Derived from ExperimentRecord[] provided by WorkbenchContext; NOT the full ExperimentRecord.
 */
export interface CalendarRecord {
  id: string;
  /** The SciNote that owns this record — used to build the workbench navigation URL. */
  sciNoteId: string;
  title: string;
  experimentStatus: ExperimentStatus;
  /** ISO 8601 timestamp (from ExperimentRecord.createdAt). */
  createdAt: string;
  /** YYYY-MM-DD local date string derived from createdAt. */
  dateStr: string;
}

// ---------------------------------------------------------------------------
// Date → record index (the main in-memory structure)
// ---------------------------------------------------------------------------

/** Maps YYYY-MM-DD → CalendarRecord[] for all records found in the session. */
export type DateRecordMap = Map<string, CalendarRecord[]>;

// ---------------------------------------------------------------------------
// Status colour config (used by CalendarGrid and RecordDayList)
// ---------------------------------------------------------------------------

export const STATUS_DOT_CLASS: Record<ExperimentStatus, string> = {
  "探索中": "bg-blue-500",
  "可复现": "bg-green-500",
  "失败":   "bg-red-400",
  "已验证": "bg-purple-500",
};

export const STATUS_TEXT_CLASS: Record<ExperimentStatus, string> = {
  "探索中": "text-blue-600",
  "可复现": "text-green-600",
  "失败":   "text-red-500",
  "已验证": "text-purple-600",
};

export const STATUS_BG_CLASS: Record<ExperimentStatus, string> = {
  "探索中": "bg-blue-50 border-blue-200",
  "可复现": "bg-green-50 border-green-200",
  "失败":   "bg-red-50 border-red-200",
  "已验证": "bg-purple-50 border-purple-200",
};
