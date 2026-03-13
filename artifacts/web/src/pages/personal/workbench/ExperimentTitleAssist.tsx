import React, { useRef, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useWorkbench } from "@/contexts/WorkbenchContext";

/**
 * ExperimentTitleAssist — small floating popover anchored to the AI icon button.
 *
 * Appears when aiAssistOpen=true. Lets the user type a brief experiment purpose,
 * then calls runAiAssist() which mock-generates a title, inserts a purpose
 * paragraph into the editor, and highlights related ontology modules.
 */
export function ExperimentTitleAssist() {
  const {
    aiAssistOpen,
    setAiAssistOpen,
    purposeInput,
    setPurposeInput,
    isGenerating,
    runAiAssist,
  } = useWorkbench();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aiAssistOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [aiAssistOpen]);

  if (!aiAssistOpen) return null;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") runAiAssist();
    if (e.key === "Escape") setAiAssistOpen(false);
  }

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white rounded-lg border border-gray-200 shadow-lg p-3 flex flex-col gap-2.5">
      <p className="text-xs text-gray-500">输入今天想做的实验目的</p>

      <input
        ref={inputRef}
        type="text"
        value={purposeInput}
        onChange={(e) => setPurposeInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="例如：探索退火温度对薄膜形貌的影响"
        disabled={isGenerating}
        className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-gray-400 placeholder-gray-300 disabled:opacity-50"
      />

      <div className="flex items-center justify-between">
        <button
          onClick={() => setAiAssistOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          取消
        </button>
        <button
          onClick={runAiAssist}
          disabled={!purposeInput.trim() || isGenerating}
          className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-2.5 py-1 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          {isGenerating ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Sparkles size={11} />
          )}
          {isGenerating ? "生成中…" : "生成"}
        </button>
      </div>
    </div>
  );
}
