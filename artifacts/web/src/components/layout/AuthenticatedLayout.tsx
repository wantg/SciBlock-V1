import React from "react";
import { AppSidebar } from "@/pages/home/AppSidebar";
import { NewExperimentDraftProvider } from "@/contexts/NewExperimentDraftContext";

interface Props {
  children: React.ReactNode;
}

/**
 * Shared shell for all authenticated pages.
 * Renders the persistent sidebar on the left; page content fills the right.
 * Individual pages must NOT render their own sidebar.
 *
 * NewExperimentDraftProvider is placed here so that both AppSidebar and
 * NewExperimentPage share the same draft-name state without prop drilling.
 */
export function AuthenticatedLayout({ children }: Props) {
  return (
    <NewExperimentDraftProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </NewExperimentDraftProvider>
  );
}
