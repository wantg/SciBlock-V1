import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "../FormField";
import type { Step6Data } from "@/types/wizardForm";

interface Props {
  data: Step6Data;
  onChange: (updates: Partial<Step6Data>) => void;
}

export function Step6Data({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">实验数据</h1>
        <p className="mt-1 text-sm text-gray-500">说明数据的记录方式与预期结果</p>
      </div>

      <div className="flex flex-col gap-5">
        <FormField label="数据记录方式">
          <Input
            placeholder="例如：电子表格、手动记录本、自动采集…"
            value={data.recordingMethod}
            onChange={(e) => onChange({ recordingMethod: e.target.value })}
          />
        </FormField>

        <FormField label="预期结果">
          <Textarea
            rows={5}
            className="resize-none"
            placeholder="描述实验预期得到的数据形态或结论"
            value={data.expectedResults}
            onChange={(e) => onChange({ expectedResults: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}
