import type { ExperimentRecord } from "@/types/workbench";
import { makeTag } from "@/types/experimentFields";

// ---------------------------------------------------------------------------
// Migration helpers
// ---------------------------------------------------------------------------

/**
 * Convert legacy string[] attributes to Tag[] on any SystemObject items.
 * Runs once on load; no-op if the data is already in the new format.
 */
function migrateModule(mod: import("@/types/workbench").OntologyModule): import("@/types/workbench").OntologyModule {
  const sd = mod.structuredData as Record<string, unknown> | undefined;
  if (!sd?.systemObjects) return mod;

  const objects = sd.systemObjects as Array<Record<string, unknown>>;
  const needsMigration = objects.some(
    (o) => Array.isArray(o.attributes) && o.attributes.length > 0 && typeof o.attributes[0] === "string",
  );
  if (!needsMigration) return mod;

  const migratedObjects = objects.map((o) => {
    if (!Array.isArray(o.attributes)) return o;
    const attrs = (o.attributes as unknown[]).map((a) => {
      if (typeof a !== "string") return a;
      const colonIdx = a.indexOf(":");
      if (colonIdx > 0 && colonIdx < a.length - 1) {
        return makeTag(a.slice(0, colonIdx).trim(), a.slice(colonIdx + 1).trim());
      }
      return makeTag(a, "");
    });
    return { ...o, attributes: attrs };
  });

  return {
    ...mod,
    structuredData: {
      ...sd,
      systemObjects: migratedObjects as unknown as import("@/types/ontologyModules").SystemObject[],
    },
  };
}

function migrateRecord(record: ExperimentRecord): ExperimentRecord {
  return {
    ...record,
    currentModules: record.currentModules.map(migrateModule),
  };
}

/**
 * Persistence layer for workbench experiment records.
 *
 * Storage: sessionStorage — tab-scoped, survives page refresh but not tab close.
 * Key namespace: "sciblock:workbench:<sciNoteId>" — one entry per SciNote.
 *
 * This file is the single authoritative source for workbench record I/O.
 * WorkbenchContext reads from and writes to these helpers.
 * SciNoteStoreContext calls clearWorkbenchRecords() when deleting a SciNote
 * so orphaned workbench data is cleaned up immediately.
 */

const workbenchKey = (sciNoteId: string): string =>
  `sciblock:workbench:${sciNoteId}`;

/**
 * Load persisted records for a SciNote from sessionStorage.
 * Returns [] when nothing is stored or the stored data is corrupt.
 */
export function loadWorkbenchRecords(sciNoteId: string): ExperimentRecord[] {
  try {
    const raw = sessionStorage.getItem(workbenchKey(sciNoteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ExperimentRecord[]).map(migrateRecord);
  } catch {
    return [];
  }
}

/**
 * Save the current records list for a SciNote to sessionStorage.
 * Called from WorkbenchContext's useEffect on every records change.
 */
export function saveWorkbenchRecords(
  sciNoteId: string,
  records: ExperimentRecord[],
): void {
  try {
    sessionStorage.setItem(workbenchKey(sciNoteId), JSON.stringify(records));
  } catch {
    // sessionStorage unavailable (private mode, quota exceeded, etc.)
  }
}

/**
 * Remove the workbench storage entry for a SciNote.
 * Called by SciNoteStoreContext when a SciNote is permanently deleted,
 * so orphaned session data is cleaned up without requiring a workbench mount.
 */
export function clearWorkbenchRecords(sciNoteId: string): void {
  try {
    sessionStorage.removeItem(workbenchKey(sciNoteId));
  } catch {
    // sessionStorage unavailable
  }
}
