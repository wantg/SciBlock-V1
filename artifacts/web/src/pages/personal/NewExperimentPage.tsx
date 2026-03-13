import React, { useState, useMemo, useEffect, useRef } from "react";
import { StepNav } from "./new-experiment/StepNav";
import { StepFooter } from "./new-experiment/StepFooter";
import { Step1Choice } from "./new-experiment/steps/Step1Choice";
import { Step1References } from "./new-experiment/steps/Step1References";
import { Step2System } from "./new-experiment/steps/Step2System";
import { Step3Preparation } from "./new-experiment/steps/Step3Preparation";
import { Step4Operation } from "./new-experiment/steps/Step4Operation";
import { Step5Measurement } from "./new-experiment/steps/Step5Measurement";
import { Step6Data } from "./new-experiment/steps/Step6Data";
import { useReferences } from "@/hooks/useReferences";
import { useWizardForm } from "@/hooks/useWizardForm";
import { useNewExperimentDraft } from "@/contexts/NewExperimentDraftContext";
import { AI_MOCK_FILL } from "@/data/aiMockFill";

const TOTAL_STEPS = 6;

/**
 * Steps unlocked in the nav after AI analysis completes.
 * Step 6 (实验数据) is excluded — data is collected during the experiment, not pre-filled.
 */
const UPLOAD_UNLOCKED_STEPS: ReadonlySet<number> = new Set([2, 3, 4, 5]);

type Step1Path = "choice" | "uploading";

export function NewExperimentPage() {
  const [activeStepId, setActiveStepId] = useState(1);
  const [step1Path, setStep1Path] = useState<Step1Path>("choice");
  const [reviewedStepIds, setReviewedStepIds] = useState<Set<number>>(new Set());

  // Upload path: start empty — user selects their own files.
  const refs = useReferences([]);
  const form = useWizardForm();

  const { setDraftName } = useNewExperimentDraft();

  // Publish experiment name to sidebar in real time.
  // Empty string is fine — the sidebar renders "未命名实验" as a fallback.
  useEffect(() => {
    setDraftName(form.data.step2.experimentName);
  }, [form.data.step2.experimentName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove the sidebar draft entry when leaving the page.
  useEffect(() => {
    return () => {
      setDraftName(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard so we only populate from AI once per session.
  const hasPopulated = useRef(false);
  useEffect(() => {
    if (refs.analysisComplete && !hasPopulated.current) {
      hasPopulated.current = true;
      form.populateFromAI(AI_MOCK_FILL);
    }
  }, [refs.analysisComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Which steps show the AI-ready indicator in the left nav.
   * Only active for the upload path once analysis finishes.
   */
  const unlockedStepIds = useMemo<ReadonlySet<number> | undefined>(() => {
    if (step1Path === "uploading" && refs.analysisComplete) {
      return UPLOAD_UNLOCKED_STEPS;
    }
    return undefined;
  }, [step1Path, refs.analysisComplete]);

  function goToStep(stepId: number) {
    if (stepId < 1 || stepId > TOTAL_STEPS) return;
    if (stepId === 1) setStep1Path("choice");

    // Mark as reviewed when the user first visits an unlocked step.
    if (unlockedStepIds?.has(stepId)) {
      setReviewedStepIds((prev) => {
        if (prev.has(stepId)) return prev;
        const next = new Set(prev);
        next.add(stepId);
        return next;
      });
    }

    setActiveStepId(stepId);
  }

  function handleChooseUpload() {
    setStep1Path("uploading");
  }

  function handleSkip() {
    goToStep(2);
  }

  function handleFinish() {
    // TODO: submit to backend when ready
    console.log("Finish initialization", form.data);
  }

  function renderStepContent() {
    switch (activeStepId) {
      case 1:
        if (step1Path === "choice") {
          return (
            <Step1Choice
              onChooseUpload={handleChooseUpload}
              onSkip={handleSkip}
            />
          );
        }
        return (
          <Step1References
            files={refs.files}
            onAddFiles={refs.addFiles}
            onRemoveFile={refs.removeFile}
            onAnalyze={refs.analyze}
            canAnalyze={refs.canAnalyze}
            isAnalyzing={refs.isAnalyzing}
            analysisComplete={refs.analysisComplete}
            onProceed={() => goToStep(2)}
          />
        );

      case 2:
        return (
          <Step2System
            data={form.data.step2}
            onChange={(u) => form.patch("step2", u)}
            aiFilled={form.isAiFilled}
          />
        );

      case 3:
        return (
          <Step3Preparation
            data={form.data.step3}
            onChange={(u) => form.patch("step3", u)}
            aiFilled={form.isAiFilled}
          />
        );

      case 4:
        return (
          <Step4Operation
            data={form.data.step4}
            onChange={(u) => form.patch("step4", u)}
            aiFilled={form.isAiFilled}
          />
        );

      case 5:
        return (
          <Step5Measurement
            data={form.data.step5}
            onChange={(u) => form.patch("step5", u)}
            aiFilled={form.isAiFilled}
          />
        );

      case 6:
        return (
          <Step6Data
            data={form.data.step6}
            onChange={(u) => form.patch("step6", u)}
          />
        );

      default:
        return null;
    }
  }

  const showFooter = activeStepId >= 2;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Wizard step navigation */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col px-4 py-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 px-1">
          初始化步骤
        </p>
        <StepNav
          activeStepId={activeStepId}
          onStepClick={goToStep}
          canFinish={form.canFinish}
          onFinish={handleFinish}
          unlockedStepIds={unlockedStepIds}
          reviewedStepIds={reviewedStepIds}
        />
      </aside>

      {/* Step content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="flex flex-col min-h-full px-10 py-10">
          <div className="flex-1">{renderStepContent()}</div>

          {showFooter && (
            <StepFooter
              stepId={activeStepId}
              totalSteps={TOTAL_STEPS}
              onPrev={() => goToStep(activeStepId - 1)}
              onNext={() => goToStep(activeStepId + 1)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
