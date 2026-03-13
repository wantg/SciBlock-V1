import React from "react";
import type { Step5Data } from "@/types/wizardForm";

interface Props {
  data: Step5Data;
  onChange: (updates: Partial<Step5Data>) => void;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition";

const textareaCls = inputCls + " resize-none";

export function Step5Measurement({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">测量过程</h1>
        <p className="mt-1 text-sm text-gray-500">定义需要测量的指标与使用的测量方法</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            测量指标
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="例如：电阻率、折射率、粒径分布…"
            value={data.metrics}
            onChange={(e) => onChange({ metrics: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            测量方法
          </label>
          <textarea
            rows={4}
            className={textareaCls}
            placeholder="描述采用的测量方法或标准"
            value={data.method}
            onChange={(e) => onChange({ method: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            测量仪器与设备
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="例如：万用表、显微镜、色谱仪…"
            value={data.instruments}
            onChange={(e) => onChange({ instruments: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
