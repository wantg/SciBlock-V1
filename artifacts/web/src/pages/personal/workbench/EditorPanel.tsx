import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useWorkbench } from "@/contexts/WorkbenchContext";

/**
 * EditorPanel — the main rich-text editing area powered by TipTap.
 *
 * Responsibilities:
 *   - Initialises TipTap with StarterKit on mount
 *   - Registers an "insert at top" function with WorkbenchContext so that
 *     AI title assist and flow-draft generation can push content in
 *   - Syncs outgoing changes back to context via updateEditorContent
 *   - Shows a subtle prompt when content is empty
 */
export function EditorPanel() {
  const {
    currentRecord,
    updateEditorContent,
    registerEditorInsert,
    unregisterEditorInsert,
    flowDraftInserted,
  } = useWorkbench();

  const editor = useEditor({
    extensions: [StarterKit],
    content: currentRecord.editorContent || "",
    onUpdate: ({ editor }) => {
      updateEditorContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none outline-none min-h-[200px] px-8 py-6 text-gray-800 leading-relaxed focus:outline-none",
      },
    },
  });

  // When switching to a different record, reload editor content.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== currentRecord.editorContent) {
      editor.commands.setContent(currentRecord.editorContent || "");
    }
  }, [currentRecord.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Register the insert function so the context can push content in.
  useEffect(() => {
    if (!editor) return;

    function insertAtTop(html: string) {
      editor?.commands.insertContentAt(0, html);
    }

    registerEditorInsert(insertAtTop);
    return () => unregisterEditorInsert();
  }, [editor, registerEditorInsert, unregisterEditorInsert]);

  const isEmpty =
    !currentRecord.editorContent ||
    currentRecord.editorContent === "<p></p>" ||
    currentRecord.editorContent === "";

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 overflow-hidden">
      {/* Toolbar placeholder — phase 2 */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-4 py-1.5 flex items-center gap-1 min-h-[36px]">
        <span className="text-xs text-gray-300">富文本工具栏（第二阶段）</span>
        {flowDraftInserted && (
          <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
            流程草稿已生成
          </span>
        )}
      </div>

      {/* Editor content area */}
      <div className="flex-1 overflow-y-auto relative">
        {isEmpty && (
          <div className="absolute top-8 left-8 right-8 pointer-events-none text-sm text-gray-300 italic leading-relaxed">
            在此记录实验过程…<br />
            点击左侧"AI"图标可自动生成实验目的；确认 4 个本体模块后将自动生成流程草稿。
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
