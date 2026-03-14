import React from "react";
import { useParams } from "wouter";
import { FlaskConical } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSciNoteStore } from "@/contexts/SciNoteStoreContext";
import { useTrash } from "@/contexts/TrashContext";
import { WorkbenchProvider, useWorkbench } from "@/contexts/WorkbenchContext";
import { WorkbenchLayout } from "./WorkbenchLayout";

// ---------------------------------------------------------------------------
// Inner layout — runs inside WorkbenchProvider to read the live title
// ---------------------------------------------------------------------------

/**
 * WorkbenchAppLayout — reads current record title from WorkbenchContext
 * and forwards it to AppLayout's title prop in real time.
 */
function WorkbenchAppLayout() {
  const { currentRecord } = useWorkbench();
  const pageTitle = currentRecord.title.trim() || "实验记录";

  return (
    <AppLayout title={pageTitle} noPadding>
      <WorkbenchLayout />
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
  const { getRestoredForSciNote } = useTrash();

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

  const extraRecords = getRestoredForSciNote(id);

  return (
    <WorkbenchProvider
      key={id}
      sciNoteId={id}
      sciNoteTitle={note.title}
      extraRecords={extraRecords}
    >
      <WorkbenchAppLayout />
    </WorkbenchProvider>
  );
}
