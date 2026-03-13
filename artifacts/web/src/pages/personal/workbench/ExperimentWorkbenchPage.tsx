import React from "react";
import { useParams, useLocation } from "wouter";
import { FlaskConical } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSciNoteStore } from "@/contexts/SciNoteStoreContext";
import { WorkbenchProvider } from "@/contexts/WorkbenchContext";
import { WorkbenchLayout } from "./WorkbenchLayout";

/**
 * ExperimentWorkbenchPage — entry point for the three-panel experiment workbench.
 *
 * Route: /personal/experiment/:id/workbench
 *
 * Wraps WorkbenchProvider (scoped to this sciNote) so that the context
 * reinitialises automatically whenever the sciNoteId in the URL changes.
 *
 * The page itself is intentionally thin — all state and layout
 * live inside WorkbenchProvider and its children.
 */
export function ExperimentWorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const { notes } = useSciNoteStore();

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

  return (
    <AppLayout title={`${note.title} · 实验记录`} noPadding>
      {/* key={id} ensures WorkbenchProvider re-mounts (and state resets)
          when navigating between different SciNotes */}
      <WorkbenchProvider key={id} sciNoteId={id}>
        <WorkbenchLayout />
      </WorkbenchProvider>
    </AppLayout>
  );
}
