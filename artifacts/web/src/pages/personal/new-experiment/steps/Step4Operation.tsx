import React from "react";
import type { Step4Data } from "@/types/wizardForm";

interface Props {
  data: Step4Data;
  onChange: (updates: Partial<Step4Data>) => void;
}

const textareaCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition resize-none";

export function Step4Operation({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">实验操作</h1>
        <p className="mt-1 text-sm text-gray-500">描述实验的具体操作步骤与注意事项</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            操作步骤
          </label>
          <textarea
            rows={6}
            className={textareaCls}
            placeholder="按顺序描述实验的每一个操作步骤"
            value={data.operationSteps}
            onChange={(e) => onChange({ operationSteps: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            操作注意事项
          </label>
          <textarea
            rows={4}
            className={textareaCls}
            placeholder="列出操作过程中需要特别注意的事项或安全规范"
            value={data.cautions}
            onChange={(e) => onChange({ cautions: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
