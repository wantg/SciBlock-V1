import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useExperimentWizard } from "@/hooks/useExperimentWizard";
import { useNewExperimentDraft } from "@/contexts/NewExperimentDraftContext";
import { useSciNoteStore } from "@/contexts/SciNoteStoreContext";
import { getExperimentName } from "@/types/experimentFields";
import { WizardShell } from "./new-experiment/WizardShell";

/**
 * NewExperimentPage — creates a brand-new SciNote via the initialization wizard.
 *
 * Responsibilities specific to this page (vs. ReinitializeExperimentPage):
 *   - Publishes the experiment name to the sidebar draft entry in real time
 *   - On finish: awaits createSciNote (may call API) → navigates to the new note
 */
export function NewExperimentPage() {
  const [, navigate] = useLocation();
  const { createSciNote } = useSciNoteStore();
  const { setDraftName } = useNewExperimentDraft();

  const wizard = useExperimentWizard();

  // Keep the sidebar draft entry label in sync with the experiment name field.
  const experimentName = getExperimentName(wizard.form.data.step2.fields);
  useEffect(() => {
    setDraftName(experimentName);
  }, [experimentName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove the draft entry when the user leaves the wizard.
  useEffect(() => {
    return () => setDraftName(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFinish() {
    const id = await createSciNote(wizard.form.data);
    navigate(`/personal/experiment/${id}`);
  }

  const navHeader = (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 px-1">
      初始化步骤
    </p>
  );

  return (
    <WizardShell
      wizard={wizard}
      navHeader={navHeader}
      onFinish={handleFinish}
    />
  );
}
