/**
 * AiPanel — AI 对话面板
 *
 * Layer: page-level component (composition + WorkbenchContext access)
 *
 * 职责:
 *   - 从 WorkbenchContext 中提取当前实验上下文，作为 AI system prompt 的一部分
 *   - 组合 useAiChat hook + ChatMessageBubble + ChatInput 形成完整对话界面
 *   - 管理面板内部 UI 状态（是否显示帮助提示等）
 *
 * 布局 (从上到下):
 *   ┌─ Header (标题 + 清空按钮) ──────────────────┐
 *   ├─ Context badge (当前实验名，可选) ───────────┤
 *   ├─ Message list (滚动区) ──────────────────────┤
 *   │    [空状态: 快捷问题chip]                    │
 *   ├─ Error banner (条件渲染) ────────────────────┤
 *   └─ ChatInput ──────────────────────────────────┘
 */

import React, { useEffect, useRef, useState } from "react";
import { Bot, Trash2, FlaskConical } from "lucide-react";
import { useWorkbench } from "../../../../contexts/WorkbenchContext";
import { ChatMessageBubble } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useAiChat } from "./useAiChat";
import { fetchAiStatus } from "../../../../api/aiChat";
import type { OntologyModule } from "../../../../types/workbench";

// ---------------------------------------------------------------------------
// Context builder — converts ExperimentRecord to a compact text summary
// ---------------------------------------------------------------------------

const MODULE_LABELS: Record<string, string> = {
  system:      "实验体系",
  preparation: "样品制备",
  operation:   "实验操作",
  measurement: "测量分析",
  data:        "数据处理",
};

const STATUS_LABELS: Record<string, string> = {
  探索中:  "探索中",
  可复现:  "可复现",
  已验证:  "已验证",
  失败:    "失败",
};

function buildExperimentContext(
  title: string,
  experimentCode: string,
  experimentStatus: string,
  purposeInput: string | undefined,
  modules: OntologyModule[],
): string {
  const lines: string[] = [
    `实验名称: ${title}`,
    `实验代号: ${experimentCode}`,
    `实验状态: ${STATUS_LABELS[experimentStatus] ?? experimentStatus}`,
  ];

  if (purposeInput) {
    lines.push(`实验目的: ${purposeInput}`);
  }

  const moduleLines = modules.map((m) => {
    const label = MODULE_LABELS[m.key] ?? m.key;
    const status = m.status === "confirmed" ? "已确认" : "继承中";
    return `  ${label}: ${status}`;
  });

  if (moduleLines.length > 0) {
    lines.push("模块状态:");
    lines.push(...moduleLines);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Quick-start chips (shown when chat is empty)
// ---------------------------------------------------------------------------

const QUICK_STARTERS = [
  "分析当前实验的数据结果",
  "给出实验改进建议",
  "帮我解释实验现象",
  "如何提高实验重现性？",
];

// ---------------------------------------------------------------------------
// AiUnconfigured — shown when /api/ai/status returns available: false
// ---------------------------------------------------------------------------

function AiUnconfigured() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 gap-3 text-center">
      <Bot size={24} className="text-gray-300" />
      <p className="text-xs font-semibold text-gray-500">AI 助手未配置</p>
      <p className="text-[10px] text-gray-400 leading-relaxed">
        管理员尚未配置 AI 服务密钥。<br />
        请设置 <code className="bg-gray-100 px-1 rounded">DASHSCOPE_API_KEY</code>（千问）<br />
        或 <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code>（OpenAI）<br />
        后重启服务器。
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AiPanel
// ---------------------------------------------------------------------------

interface Props {
  isOpen: boolean;
}

export function AiPanel({ isOpen }: Props) {
  const { currentRecord } = useWorkbench();

  const systemContext = buildExperimentContext(
    currentRecord.title,
    currentRecord.experimentCode,
    currentRecord.experimentStatus,
    currentRecord.purposeInput,
    currentRecord.currentModules,
  );

  const { state, send, clear, canSend } = useAiChat(systemContext);
  const bottomRef = useRef<HTMLDivElement>(null);

  // null = still checking; true/false = known state
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetchAiStatus().then(({ available }) => setAiAvailable(available));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  if (!isOpen) return null;

  const isEmpty = state.messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-gray-700" />
          <span className="text-xs font-semibold text-gray-800">AI 助手</span>
        </div>
        {!isEmpty && aiAvailable !== false && (
          <button
            onClick={clear}
            title="清空对话"
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* ── Not configured state ── */}
      {aiAvailable === false ? (
        <AiUnconfigured />
      ) : (
        <>
          {/* ── Experiment context badge ── */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            <FlaskConical size={10} className="text-gray-400 flex-shrink-0" />
            <span className="text-[10px] text-gray-500 truncate" title={currentRecord.title}>
              {currentRecord.title}
            </span>
          </div>

          {/* ── Message list ── */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">
            {isEmpty ? (
              /* Empty state: welcome + quick-start chips */
              <div className="flex flex-col gap-3 mt-2">
                <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                  您好！我是 SciBlock AI 助手。<br />
                  基于当前实验上下文，我可以帮您分析数据、解答问题。
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_STARTERS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={!canSend}
                      className="text-left text-[10px] text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors leading-snug"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              state.messages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Error banner ── */}
          {state.error && (
            <div className="mx-3 mb-2 px-2.5 py-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-600 leading-snug flex-shrink-0">
              {state.error}
            </div>
          )}

          {/* ── Input ── */}
          <div className="flex-shrink-0">
            <ChatInput
              onSend={send}
              disabled={!canSend}
              placeholder="输入实验相关问题，Enter 发送…"
            />
          </div>
        </>
      )}
    </div>
  );
}
