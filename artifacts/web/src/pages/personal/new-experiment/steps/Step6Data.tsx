import React from "react";
import type { Step6Data } from "@/types/wizardForm";

interface Props {
  data: Step6Data;
  onChange: (updates: Partial<Step6Data>) => void;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition";

const textareaCls = inputCls + " resize-none";

export function Step6Data({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">实验数据</h1>
        <p className="mt-1 text-sm text-gray-500">说明数据的记录方式与预期结果</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            数据记录方式
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="例如：电子表格、手动记录本、自动采集…"
            value={data.recordingMethod}
            onChange={(e) => onChange({ recordingMethod: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            预期结果
          </label>
          <textarea
            rows={5}
            className={textareaCls}
            placeholder="描述实验预期得到的数据形态或结论"
            value={data.expectedResults}
            onChange={(e) => onChange({ expectedResults: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
