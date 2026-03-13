import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "../FormField";
import { AiFillBanner } from "../AiFillBanner";
import type { Step2Data } from "@/types/wizardForm";

interface Props {
  data: Step2Data;
  onChange: (updates: Partial<Step2Data>) => void;
  aiFilled?: boolean;
}

export function Step2System({ data, onChange, aiFilled = false }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">实验系统</h1>
        <p className="mt-1 text-sm text-gray-500">描述本次实验的基本信息</p>
      </div>

      {aiFilled && <AiFillBanner />}

      <div className="flex flex-col gap-5">
        <FormField label="实验名称" required>
          <Input
            placeholder="为本次实验起一个名称"
            value={data.experimentName}
            onChange={(e) => onChange({ experimentName: e.target.value })}
          />
        </FormField>

        <FormField label="实验类型">
          <Input
            placeholder="例如：材料合成、性能测试、观察记录…"
            value={data.experimentType}
            onChange={(e) => onChange({ experimentType: e.target.value })}
          />
        </FormField>

        <FormField label="实验目标">
          <Textarea
            rows={4}
            className="resize-none"
            placeholder="描述本次实验希望达成的目标或验证的假设"
            value={data.goal}
            onChange={(e) => onChange({ goal: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}
