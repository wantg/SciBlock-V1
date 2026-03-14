import React from "react";
import { AppSidebar } from "@/pages/home/AppSidebar";
import { NewExperimentDraftProvider } from "@/contexts/NewExperimentDraftContext";
import { SciNoteStoreProvider } from "@/contexts/SciNoteStoreContext";
import { TrashProvider } from "@/contexts/TrashContext";

interface Props {
  children: React.ReactNode;
}

/**
 * Shared shell for all authenticated pages.
 * Renders the persistent sidebar on the left; page content fills the right.
 * Individual pages must NOT render their own sidebar.
 *
 * SciNoteStoreProvider — single source of truth for all SciNote records.
 * NewExperimentDraftProvider — live draft name shared between the init wizard
 *   and the sidebar.
 */
export function AuthenticatedLayout({ children }: Props) {
  return (
    <SciNoteStoreProvider>
      <NewExperimentDraftProvider>
        <TrashProvider>
          <div className="flex h-screen overflow-hidden bg-gray-50">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {children}
            </div>
          </div>
        </TrashProvider>
      </NewExperimentDraftProvider>
    </SciNoteStoreProvider>
  );
}
