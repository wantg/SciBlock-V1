import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "../FormField";
import { AiFillBanner } from "../AiFillBanner";
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
        <p className="mt-1 text-sm text-gray-500">描述实验的具体操作步骤与注意事项</p>
      </div>

      {aiFilled && <AiFillBanner />}

      <div className="flex flex-col gap-5">
        <FormField label="操作步骤">
          <Textarea
            rows={7}
            className="resize-none"
            placeholder="按顺序描述实验的每一个操作步骤"
            value={data.operationSteps}
            onChange={(e) => onChange({ operationSteps: e.target.value })}
          />
        </FormField>

        <FormField label="操作注意事项">
          <Textarea
            rows={4}
            className="resize-none"
            placeholder="列出操作过程中需要特别注意的事项或安全规范"
            value={data.cautions}
            onChange={(e) => onChange({ cautions: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}
