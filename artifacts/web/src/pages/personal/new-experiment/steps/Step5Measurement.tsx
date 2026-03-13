import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "../FormField";
import { AiFillBanner } from "../AiFillBanner";
import type { Step5Data } from "@/types/wizardForm";

interface Props {
  data: Step5Data;
  onChange: (updates: Partial<Step5Data>) => void;
  aiFilled?: boolean;
}

export function Step5Measurement({ data, onChange, aiFilled = false }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">测量过程</h1>
        <p className="mt-1 text-sm text-gray-500">定义需要测量的指标与使用的测量方法</p>
      </div>

      {aiFilled && <AiFillBanner />}

      <div className="flex flex-col gap-5">
        <FormField label="测量指标">
          <Input
            placeholder="例如：电阻率、折射率、粒径分布…"
            value={data.metrics}
            onChange={(e) => onChange({ metrics: e.target.value })}
          />
        </FormField>

        <FormField label="测量方法">
          <Textarea
            rows={4}
            className="resize-none"
            placeholder="描述采用的测量方法或标准"
            value={data.method}
            onChange={(e) => onChange({ method: e.target.value })}
          />
        </FormField>

        <FormField label="测量仪器与设备">
          <Input
            placeholder="例如：万用表、显微镜、色谱仪…"
            value={data.instruments}
            onChange={(e) => onChange({ instruments: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}
