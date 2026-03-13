import React from "react";
import type { Step2Data } from "@/types/wizardForm";

interface Props {
  data: Step2Data;
  onChange: (updates: Partial<Step2Data>) => void;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition";

const textareaCls = inputCls + " resize-none";

export function Step2System({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">实验系统</h1>
        <p className="mt-1 text-sm text-gray-500">描述本次实验的基本信息</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            实验名称 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="为本次实验起一个名称"
            value={data.experimentName}
            onChange={(e) => onChange({ experimentName: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            实验类型
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="例如：材料合成、性能测试、观察记录…"
            value={data.experimentType}
            onChange={(e) => onChange({ experimentType: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            实验目标
          </label>
          <textarea
            rows={4}
            className={textareaCls}
            placeholder="描述本次实验希望达成的目标或验证的假设"
            value={data.goal}
            onChange={(e) => onChange({ goal: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
