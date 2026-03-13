import React from "react";
import type { Step3Data } from "@/types/wizardForm";

interface Props {
  data: Step3Data;
  onChange: (updates: Partial<Step3Data>) => void;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition";

const textareaCls = inputCls + " resize-none";

export function Step3Preparation({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">实验准备</h1>
        <p className="mt-1 text-sm text-gray-500">列出实验所需的材料、环境及时间安排</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            所需材料与试剂
          </label>
          <textarea
            rows={5}
            className={textareaCls}
            placeholder="列出实验所需的所有材料、试剂及其用量"
            value={data.materials}
            onChange={(e) => onChange({ materials: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            实验环境要求
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="例如：温度 25°C、洁净室、无水环境…"
            value={data.environment}
            onChange={(e) => onChange({ environment: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            预计准备时间
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="例如：2 小时、1 天…"
            value={data.estimatedTime}
            onChange={(e) => onChange({ estimatedTime: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
