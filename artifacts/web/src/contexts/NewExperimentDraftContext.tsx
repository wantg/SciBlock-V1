import React, { createContext, useContext, useState } from "react";

interface NewExperimentDraftContextValue {
  /**
   * The live experiment name from the initialization form.
   * - `null`   → no draft is in progress (hide sidebar entry)
   * - `string` → draft is active; empty string means the user hasn't typed a name yet
   */
  draftName: string | null;
  setDraftName: (name: string | null) => void;
}

const NewExperimentDraftContext = createContext<NewExperimentDraftContextValue | null>(null);

export function NewExperimentDraftProvider({ children }: { children: React.ReactNode }) {
  const [draftName, setDraftName] = useState<string | null>(null);
  return (
    <NewExperimentDraftContext.Provider value={{ draftName, setDraftName }}>
      {children}
    </NewExperimentDraftContext.Provider>
  );
}

export function useNewExperimentDraft(): NewExperimentDraftContextValue {
  const ctx = useContext(NewExperimentDraftContext);
  if (!ctx) {
    throw new Error("useNewExperimentDraft must be used inside NewExperimentDraftProvider");
  }
  return ctx;
}
