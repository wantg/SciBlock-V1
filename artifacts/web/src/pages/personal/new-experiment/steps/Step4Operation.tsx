import React from "react";
import { AiFillBanner } from "../AiFillBanner";
import { Step4OperationEditor } from "../fields/Step4OperationEditor";
import type { Step4Data } from "@/types/wizardForm";

interface Props {
  data: Step4Data;
  onChange: (updates: Partial<Step4Data>) => void;
  aiFilled?: boolean;
}

export function Step4Operation({ data, onChange, aiFilled = false }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">实验操作</h1>
        <p className="mt-1 text-sm text-gray-500">
          每个步骤按顺序排列，可填写关键参数和备注 / 注意事项。步骤编号自动维护。
        </p>
      </div>

      {aiFilled && <AiFillBanner />}

      <Step4OperationEditor
        items={data.items}
        onChange={(items) => onChange({ items })}
      />
    </div>
  );
}
