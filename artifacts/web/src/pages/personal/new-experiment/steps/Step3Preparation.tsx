import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "../FormField";
import type { Step3Data } from "@/types/wizardForm";

interface Props {
  data: Step3Data;
  onChange: (updates: Partial<Step3Data>) => void;
}

export function Step3Preparation({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">实验准备</h1>
        <p className="mt-1 text-sm text-gray-500">列出实验所需的材料、环境及时间安排</p>
      </div>

      <div className="flex flex-col gap-5">
        <FormField label="所需材料与试剂">
          <Textarea
            rows={5}
            className="resize-none"
            placeholder="列出实验所需的所有材料、试剂及其用量"
            value={data.materials}
            onChange={(e) => onChange({ materials: e.target.value })}
          />
        </FormField>

        <FormField label="实验环境要求">
          <Input
            placeholder="例如：温度 25°C、洁净室、无水环境…"
            value={data.environment}
            onChange={(e) => onChange({ environment: e.target.value })}
          />
        </FormField>

        <FormField label="预计准备时间">
          <Input
            placeholder="例如：2 小时、1 天…"
            value={data.estimatedTime}
            onChange={(e) => onChange({ estimatedTime: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}
