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
 * Edit flow (Phase 2.1 — reliable save):
 *   view mode → click "编辑报告" → editor becomes editable
 *   edit mode → "保存修改" awaits commitReport() — backend persists before
 *               exiting edit mode; failure keeps edit mode open + shows error
 *             → "取消" restores original content without saving
 *
 * Regenerate flow (Phase 2.1 — no race condition):
 *   ready mode → click "重新生成" → triggerRegenerate() fires a single
 *   POST /report/regenerate (atomic overwrite); no separate DELETE is sent.
 *
 * The TipTap editor instance is kept alive through all modes to avoid
 * re-mounting costs; only the `editable` property is toggled.
 */

import React, { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { ReportProgress } from "./ReportProgress";
import type { OntologyModuleKey } from "@/types/workbench";
import type { ReportStatus } from "@/types/report";

export function ReportSection() {
  const {
    currentRecord,
    reportStatus,
    triggerReportGeneration,
    triggerRegenerate,
    commitReport,
    clearReport,
  } = useWorkbench();

  const [isEditing, setIsEditing]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const latestReportHtmlRef           = useRef(currentRecord.reportHtml ?? "");

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
    setSaveError(null);
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
    setSaveError(null);
    setIsEditing(true);
  }

  /**
   * Await-able save: commitReport() awaits PUT /report before exiting edit mode.
   * "保存修改" is now semantically equivalent to "backend has persisted the change".
   * On failure the edit mode stays open and a clear error message is shown.
   */
  async function handleSave() {
    if (!editor || isSaving) return;
    const html = editor.getHTML();
    setIsSaving(true);
    setSaveError(null);
    try {
      await commitReport(html);
      latestReportHtmlRef.current = html;
      setIsEditing(false);
    } catch {
      setSaveError("保存失败，请检查网络后重试");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    if (editor && currentRecord.reportHtml) {
      editor.commands.setContent(currentRecord.reportHtml);
    }
    setSaveError(null);
    setIsEditing(false);
  }

  /**
   * Atomic regenerate: a single POST /report/regenerate overwrites the existing
   * report on the server — no separate DELETE is sent, so there is no race
   * condition between concurrent DB writes.
   */
  function handleRegenerate() {
    if (!window.confirm("重新生成将覆盖当前报告，确认继续？")) return;
    triggerRegenerate();
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
              onClick={handleRegenerate}
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
              disabled={isSaving}
              className="text-xs px-3 py-1 rounded-md text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSaving && (
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSaving ? "保存中…" : "保存修改"}
            </button>
          </div>
        )}
      </div>

      {/* Save error banner */}
      {saveError && isEditing && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-600">{saveError}</p>
        </div>
      )}

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
