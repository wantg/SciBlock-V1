/**
 * calendarRecords.ts — data transformation helpers for the calendar panel.
 *
 * Layer: Pure utilities (no React, no context, no storage access).
 *
 * Builds an in-memory date index from ExperimentRecord[] provided by
 * WorkbenchContext. The records are the authoritative in-memory data source;
 * sessionStorage is only a cache and must not be read directly from here.
 *
 * Migration path to cross-SciNote view:
 *   Replace the records argument with a fetch() call to
 *   GET /api/experiments?fields=id,sciNoteId,title,status,createdAt
 *   and reconstruct CalendarRecord[] from the response.
 *   The return type and callers do not need to change.
 */

import type { CalendarRecord, DateRecordMap } from "@/types/calendarPanel";
import type { ExperimentRecord, ExperimentStatus } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a date→record index from the given experiment records.
 * Pure function — no side effects, no storage reads.
 *
 * @param records  ExperimentRecord[] from WorkbenchContext (current SciNote).
 * @param sciNoteId  The SciNote that owns these records.
 */
export function buildCalendarRecordMap(
  records: ExperimentRecord[],
  sciNoteId: string,
): DateRecordMap {
  const map: DateRecordMap = new Map();

  for (const r of records) {
    if (!r?.id || !r?.createdAt) continue;
    const dateStr = r.createdAt.slice(0, 10);
    const cal: CalendarRecord = {
      id: r.id,
      sciNoteId,
      title: r.title?.trim() || "（未命名实验）",
      experimentStatus: (r.experimentStatus ?? "探索中") as ExperimentStatus,
      createdAt: r.createdAt,
      dateStr,
    };
    const list = map.get(dateStr) ?? [];
    list.push(cal);
    map.set(dateStr, list);
  }

  return map;
}

/**
 * Return the N most-recent calendar days that have at least one record,
 * sorted newest-first. Used for the "recent experiments" section.
 */
export function getRecentDays(
  map: DateRecordMap,
  maxDays = 5,
): Array<{ dateStr: string; records: CalendarRecord[] }> {
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // descending date
    .slice(0, maxDays)
    .map(([dateStr, records]) => ({ dateStr, records }));
}

/**
 * Format a YYYY-MM-DD string as a locale-friendly label.
 * e.g. "2026-03-14" → "3月14日 (周六)"
 */
export function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("zh-CN", {
    month: "long",
    day:   "numeric",
    weekday: "short",
  });
}
