import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  stepId: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
}

export function StepFooter({ stepId, totalSteps, onPrev, onNext }: Props) {
  const isFirst = stepId <= 1;
  const isLast = stepId >= totalSteps;

  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
      <button
        onClick={onPrev}
        disabled={isFirst}
        className={[
          "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          isFirst
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
        ].join(" ")}
      >
        <ArrowLeft size={14} />
        上一步
      </button>

      {!isLast && (
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          下一步
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
