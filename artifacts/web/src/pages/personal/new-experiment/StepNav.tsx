import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { EXPERIMENT_STEPS } from "@/config/experimentSteps";
import type { WizardStep } from "@/types/experiment";

interface Props {
  activeStepId: number;
  onStepClick: (stepId: number) => void;
  canFinish: boolean;
  onFinish: () => void;
  /** Steps that are visually marked as AI-ready (analysis complete). */
  unlockedStepIds?: ReadonlySet<number>;
}

interface StepItemProps {
  step: WizardStep;
  active: boolean;
  done: boolean;
  unlocked: boolean;
  onClick: () => void;
}

function StepIndicator({
  active,
  done,
  unlocked,
  stepId,
}: {
  active: boolean;
  done: boolean;
  unlocked: boolean;
  stepId: number;
}) {
  if (active) {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full border border-white text-white text-xs flex items-center justify-center font-medium">
        {stepId}
      </span>
    );
  }
  if (done) {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full border border-green-500 text-xs flex items-center justify-center">
        <CheckCircle2 size={14} className="text-green-500" />
      </span>
    );
  }
  if (unlocked) {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full border border-sky-400 text-xs flex items-center justify-center">
        <Sparkles size={10} className="text-sky-400" />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full border border-gray-300 text-gray-400 text-xs flex items-center justify-center font-medium">
      {stepId}
    </span>
  );
}

function StepItem({ step, active, done, unlocked, onClick }: StepItemProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      ].join(" ")}
    >
      <StepIndicator
        active={active}
        done={done}
        unlocked={unlocked}
        stepId={step.id}
      />
      <span className="text-sm leading-tight">{step.label}</span>
    </button>
  );
}

export function StepNav({
  activeStepId,
  onStepClick,
  canFinish,
  onFinish,
  unlockedStepIds,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {EXPERIMENT_STEPS.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            active={activeStepId === step.id}
            done={step.id < activeStepId}
            unlocked={unlockedStepIds?.has(step.id) ?? false}
            onClick={() => onStepClick(step.id)}
          />
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-3 px-1">实验初始化完毕后即可开始记录</p>
        <button
          disabled={!canFinish}
          onClick={onFinish}
          className={[
            "w-full py-2 rounded-lg text-sm font-medium transition-colors",
            canFinish
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          开始记录实验
        </button>
      </div>
    </div>
  );
}
