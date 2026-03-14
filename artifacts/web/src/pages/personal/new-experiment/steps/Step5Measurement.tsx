import React from "react";
import { AiFillBanner } from "../AiFillBanner";
import { Step5MeasurementEditor } from "../fields/Step5MeasurementEditor";
import type { Step5Data } from "@/types/wizardForm";

interface Props {
  data: Step5Data;
  onChange: (updates: Partial<Step5Data>) => void;
  aiFilled?: boolean;
}

/**
 * Step 5 — 测量过程
 *
 * Each measurement event is a single card: name + instrument + method +
 * target + conditions (key:value tags).  This aligns 1:1 with the
 * workbench MeasurementItem, so wizardToModules does a direct passthrough.
 *
 * Write rule: onChange always writes to Step5Data.items[].
 * The legacy Step5Data.fields field is never written by this component.
 */
export function Step5Measurement({ data, onChange, aiFilled = false }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">测量过程</h1>
        <p className="mt-1 text-sm text-gray-500">
          每条测量项表示一次完整的测量事件，包含测量方法、仪器、目标和条件。
        </p>
      </div>

      {aiFilled && <AiFillBanner />}

      <Step5MeasurementEditor
        items={data.items}
        onChange={(items) => onChange({ items })}
      />
    </div>
  );
}
