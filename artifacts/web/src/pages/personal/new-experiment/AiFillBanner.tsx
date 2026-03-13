import React from "react";
import { Sparkles } from "lucide-react";

/**
 * Displayed at the top of steps 2–5 when their content was pre-filled by the
 * simulated AI analysis. Signals to the user that they can review and edit.
 */
export function AiFillBanner() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5">
      <Sparkles size={14} className="flex-shrink-0 text-violet-500" />
      <p className="text-sm text-violet-700">
        <span className="font-medium">AI 自动填写</span>
        <span className="mx-1.5 text-violet-400">·</span>
        内容来自参考资料，可直接修改
      </p>
    </div>
  );
}
