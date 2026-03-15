import React, { useRef, useEffect } from "react";
import { useParams } from "wouter";
import { FlaskConical, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSciNoteStore } from "@/contexts/SciNoteStoreContext";
import { useTrash } from "@/contexts/TrashContext";
import { WorkbenchProvider, useWorkbench } from "@/contexts/WorkbenchContext";
import { WorkbenchLayout } from "./WorkbenchLayout";
import { wizardToModules } from "@/data/workbenchUtils";
import type { ExperimentRecord } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Empty state — shown when no experiments exist for this SciNote
// ---------------------------------------------------------------------------

function NoExperimentsState() {
  const { createNewRecord } = useWorkbench();
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-4">
      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
        <FlaskConical size={26} className="text-gray-300" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-500 mb-1">还没有实验记录</p>
        <p className="text-xs text-gray-400">创建第一条实验记录，开始记录你的实验过程</p>
      </div>
      <button
        onClick={createNewRecord}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Plus size={15} />
        新建实验记录
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner layout — runs inside WorkbenchProvider to read the live title
// ---------------------------------------------------------------------------

/**
 * WorkbenchAppLayout — reads current record title from WorkbenchContext
 * and forwards it to AppLayout's title prop in real time.
 * Shows an empty state when the API confirms no experiments exist yet.
 */
function WorkbenchAppLayout() {
  const { currentRecord, records } = useWorkbench();
  const pageTitle = records.length > 0
    ? (currentRecord.title.trim() || "实验记录")
    : "实验记录";

  return (
    <AppLayout title={pageTitle} noPadding>
      {records.length === 0 ? <NoExperimentsState /> : <WorkbenchLayout />}
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Page entry point
// ---------------------------------------------------------------------------

/**
 * ExperimentWorkbenchPage — route /personal/experiment/:id/workbench
 *
 * WorkbenchProvider is mounted *outside* AppLayout so that WorkbenchAppLayout
 * (inside the provider) can read the live record title.
 *
 * key={id} ensures the provider re-mounts when navigating between SciNotes.
 * extraRecords seeds any records previously restored from the trash this session.
 */
export function ExperimentWorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const { notes } = useSciNoteStore();
  const { getRestoredForSciNote, clearRestoredForSciNote } = useTrash();

  // -----------------------------------------------------------------
  // Capture restored records exactly ONCE per mount via useRef.
  // Re-renders must NOT re-read the pool — that would re-inject records
  // every time the component renders, causing duplicates.
  // useRef resets to null on every remount, so each workbench visit
  // reads the pool fresh (but still only once per mount).
  // -----------------------------------------------------------------
  const extraRecordsRef = useRef<ExperimentRecord[] | null>(null);
  if (extraRecordsRef.current === null) {
    extraRecordsRef.current = getRestoredForSciNote(id);
  }

  // Clear the pool after the first render so that future remounts of this
  // page (e.g. user navigates away and comes back) start with an empty pool
  // and do NOT re-inject already-consumed records.
  // useEffect is the only safe place to call setState (i.e. clearRestoredForSciNote).
  useEffect(() => {
    clearRestoredForSciNote(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once per mount, just like the ref read above

  const note = notes.find((n) => n.id === id);

  if (!note) {
    return (
      <AppLayout title="实验记录">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FlaskConical size={36} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">找不到该 SciNote</p>
        </div>
      </AppLayout>
    );
  }

  // Derive initial modules from wizard formData when available.
  // This is only used on the very first visit (Case B in WorkbenchProvider).
  // On returning visits, persisted sessionStorage records take priority.
  const initialModules = note.formData ? wizardToModules(note.formData) : undefined;

  return (
    <WorkbenchProvider
      key={id}
      sciNoteId={id}
      sciNoteTitle={note.title}
      experimentType={note.experimentType}
      objective={note.objective}
      initialModules={initialModules}
      extraRecords={extraRecordsRef.current}
    >
      <WorkbenchAppLayout />
    </WorkbenchProvider>
  );
}
