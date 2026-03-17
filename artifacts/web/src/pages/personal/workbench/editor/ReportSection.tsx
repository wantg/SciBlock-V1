/**
 * ReportSection — AI experiment report panel inside EditorPanel.
 *
 * Layer: Component (consumes WorkbenchContext; no direct API calls).
 *
 * States:
 *   idle       → shows module confirmation progress (ReportProgress)
 *   generating → spinner overlay on the progress card
 *   ready      → TipTap read-only renderer + action bar
 *   error      → error banner + retry button
 *
 * Edit flow:
 *   view mode → click "编辑报告" → editor becomes editable
 *   edit mode → "保存修改" persists getHTML() back to record
 *             → "取消" restores original content
 *
 * The TipTap editor instance is kept alive through all modes to avoid
 * re-mounting costs; only the `editable` property is toggled.
 */

import React, { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { ReportProgress } from "./ReportProgress";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { OntologyModuleKey } from "@/types/workbench";
import type { ReportStatus } from "@/types/report";

export function ReportSection() {
  const {
    currentRecord,
    reportStatus,
    triggerReportGeneration,
    updateReport,
    clearReport,
  } = useWorkbench();

  const [isEditing, setIsEditing] = useState(false);
  // Track whether we are in "retry after error" state
  const latestReportHtmlRef = useRef(currentRecord.reportHtml ?? "");
  // Confirm dialog state for regeneration
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  const confirmedKeys = currentRecord.currentModules
    .filter((m) => m.status === "confirmed")
    .map((m) => m.key) as OntologyModuleKey[];

  // ── TipTap editor ────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [StarterKit],
    content: currentRecord.reportHtml ?? "",
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-1",
      },
    },
  });

  // When the generated report arrives (or changes externally), sync editor
  useEffect(() => {
    if (!editor) return;
    if (currentRecord.reportHtml && currentRecord.reportHtml !== latestReportHtmlRef.current) {
      latestReportHtmlRef.current = currentRecord.reportHtml;
      editor.commands.setContent(currentRecord.reportHtml);
    }
  }, [currentRecord.reportHtml, editor]);

  // Sync editable state whenever mode changes
  useEffect(() => {
    if (editor) editor.setEditable(isEditing);
  }, [isEditing, editor]);

  // When switching records, exit edit mode and re-sync content
  useEffect(() => {
    setIsEditing(false);
    if (editor) {
      const html = currentRecord.reportHtml ?? "";
      latestReportHtmlRef.current = html;
      editor.commands.setContent(html);
      editor.setEditable(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRecord.id]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleEnterEdit() {
    setIsEditing(true);
  }

  function handleSave() {
    if (editor) {
      const html = editor.getHTML();
      latestReportHtmlRef.current = html;
      updateReport(html);
    }
    setIsEditing(false);
  }

  function handleCancel() {
    if (editor && currentRecord.reportHtml) {
      editor.commands.setContent(currentRecord.reportHtml);
    }
    setIsEditing(false);
  }

  function handleRegenerateRequest() {
    setRegenerateConfirmOpen(true);
  }

  function handleConfirmRegenerate() {
    setRegenerateConfirmOpen(false);
    clearReport();
    triggerReportGeneration();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">实验报告</span>
          <StatusBadge status={reportStatus} />
        </div>
        {reportStatus === "ready" && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerateRequest}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              重新生成
            </button>
            <button
              onClick={handleEnterEdit}
              className="text-xs px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
            >
              编辑报告
            </button>
          </div>
        )}
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="text-xs px-3 py-1 rounded-md text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors"
            >
              保存修改
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Idle / in-progress: show progress card */}
        {(reportStatus === "idle" || reportStatus === "generating") && (
          <div className="relative">
            <ReportProgress
              confirmedKeys={confirmedKeys}
              status={reportStatus}
              onGenerate={triggerReportGeneration}
            />
            {reportStatus === "generating" && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2 rounded-lg">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600 font-medium">AI 正在生成实验报告…</p>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {reportStatus === "error" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-red-600">报告生成失败，请重试</p>
            <button
              onClick={triggerReportGeneration}
              className="text-sm px-4 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Ready: TipTap editor (read-only or editable) */}
        {reportStatus === "ready" && (
          <div
            className={
              isEditing
                ? "min-h-[200px] rounded-lg border border-blue-300 bg-blue-50/20 p-3 ring-1 ring-blue-200"
                : "min-h-[100px]"
            }
          >
            <EditorContent editor={editor} />
          </div>
        )}
      </div>

      {/* Regenerate confirmation dialog */}
      <ConfirmDialog
        open={regenerateConfirmOpen}
        danger
        title="重新生成报告"
        description="重新生成将覆盖当前报告内容，此操作不可撤销。确认继续？"
        confirmLabel="确认重新生成"
        cancelLabel="取消"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setRegenerateConfirmOpen(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge — small coloured pill beside the section title
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "idle")
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">待生成</span>;
  if (status === "generating")
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 animate-pulse">生成中…</span>;
  if (status === "ready")
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">已生成</span>;
  if (status === "error")
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">失败</span>;
  return null;
}
