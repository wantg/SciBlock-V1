import React, { useState } from "react";
import { StepNav } from "./new-experiment/StepNav";
import { Step1Choice } from "./new-experiment/steps/Step1Choice";
import { Step1References } from "./new-experiment/steps/Step1References";
import { useReferences } from "@/hooks/useReferences";
import { PLACEHOLDER_REFERENCES } from "@/data/experimentReferences";

type Step1Path = "choice" | "uploading";

export function NewExperimentPage() {
  const [activeStepId, setActiveStepId] = useState(1);
  const [step1Path, setStep1Path] = useState<Step1Path>("choice");
  const refs = useReferences(PLACEHOLDER_REFERENCES);

  function handleChooseUpload() {
    setStep1Path("uploading");
  }

  function handleSkip() {
    // Skip upload entirely — advance straight to step 2 (manual flow).
    setActiveStepId(2);
  }

  function handleStepClick(stepId: number) {
    // Clicking back to step 1 from elsewhere resets to the choice screen.
    if (stepId === 1) setStep1Path("choice");
    setActiveStepId(stepId);
  }

  function handleFinish() {
    // TODO: navigate to the created SciNote when backend is ready
    console.log("Finish initialization");
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
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-gray-400">
              步骤 {activeStepId} 内容开发中
            </p>
          </div>
        );
    }
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Wizard step navigation */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col px-4 py-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 px-1">
          初始化步骤
        </p>
        <StepNav
          activeStepId={activeStepId}
          onStepClick={handleStepClick}
          canFinish={false}
          onFinish={handleFinish}
        />
      </aside>

      {/* Step content */}
      <main className="flex-1 overflow-y-auto px-10 py-10 bg-gray-50">
        {renderStepContent()}
      </main>
    </div>
  );
}
