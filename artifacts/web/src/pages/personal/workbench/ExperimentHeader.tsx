import React, { useState, useRef } from "react";
import { Sparkles, X, Share2 } from "lucide-react";
import { useWorkbench } from "@/contexts/WorkbenchContext";
import { useCurrentUser } from "@/contexts/UserContext";
import { useAiTitleAssist } from "@/hooks/useAiTitleAssist";
import { useShares } from "@/hooks/useShares";
import { ExperimentTitleAssist } from "./ExperimentTitleAssist";
import { StatusPicker } from "./StatusPicker";
import { SharedWithAvatars } from "@/components/share/SharedWithAvatars";
import { ShareModal } from "@/components/share/ShareModal";

/**
 * ExperimentHeader — top section of the OntologyPanel.
 *
 * Layout:
 *   Row 1: Title + [AI icon] + [分享 button]  ← share button always in view
 *   Row 2: Status badge + experiment code
 *   Row 3: Tags
 */
export function ExperimentHeader() {
  const {
    currentRecord,
    updateTitle,
    updateStatus,
    updateExperimentCode,
    addTag,
    removeTag,
  } = useWorkbench();

  const { currentUser } = useCurrentUser();
  const assist = useAiTitleAssist();

  const [tagInput, setTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Only allow sharing for server-persisted records (UUID contains "-").
  const isPersisted = currentRecord.id.includes("-") && !currentRecord.id.startsWith("rec_");
  const canShare = isPersisted && !!currentUser;

  const shares = useShares(
    canShare
      ? {
          resourceType: "experiment_record",
          resourceId: currentRecord.id,
          resourceTitle: currentRecord.title,
          ownerId: currentUser!.id,
        }
      : {
          resourceType: "experiment_record",
          resourceId: "",
          resourceTitle: "",
          ownerId: "",
        }
  );

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    }
    if (e.key === "Backspace" && tagInput === "" && currentRecord.tags.length > 0) {
      removeTag(currentRecord.tags[currentRecord.tags.length - 1]);
    }
    if (e.key === "Escape") {
      setTagInput("");
      setIsAddingTag(false);
      tagInputRef.current?.blur();
    }
  }

  function openTagInput() {
    setIsAddingTag(true);
    setTimeout(() => tagInputRef.current?.focus(), 0);
  }

  function handleTagInputBlur() {
    if (tagInput === "") setIsAddingTag(false);
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">

      {/* Row 1: Title + AI toggle + Share button */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={currentRecord.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="实验标题（手写或 AI 生成）"
            className="flex-1 min-w-0 text-sm font-semibold text-gray-900 bg-transparent outline-none border-b border-gray-200 focus:border-gray-500 pb-0.5 placeholder-gray-300 transition-colors"
          />

          {/* AI assist toggle */}
          <button
            title="AI 辅助生成标题"
            onClick={() => assist.setAiAssistOpen(!assist.aiAssistOpen)}
            className={[
              "flex-shrink-0 p-1 rounded transition-colors",
              assist.aiAssistOpen
                ? "bg-gray-900 text-white"
                : "text-gray-300 hover:text-gray-700",
            ].join(" ")}
          >
            <Sparkles size={13} />
          </button>

          {/* Share button — prominent, always visible for persisted records */}
          {canShare && (
            <button
              type="button"
              title="分享此实验记录"
              onClick={() => setShareOpen(true)}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <Share2 size={12} />
              <span>分享</span>
              {shares.recipients.length > 0 && (
                <span className="bg-indigo-200 text-indigo-700 rounded-full px-1 text-[10px] font-bold leading-4">
                  {shares.recipients.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* AI assist popover anchored below the title row */}
        <ExperimentTitleAssist {...assist} />
      </div>

      {/* Row 2: Status badge + experiment code + avatars (if any) */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPicker
          value={currentRecord.experimentStatus}
          onChange={updateStatus}
        />

        <input
          type="text"
          value={currentRecord.experimentCode}
          onChange={(e) => updateExperimentCode(e.target.value)}
          placeholder="实验编号"
          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 outline-none focus:border-gray-400 w-24 font-mono"
        />

        {/* Shared-with avatars inline with status row */}
        {canShare && shares.recipients.length > 0 && (
          <SharedWithAvatars recipients={shares.recipients} />
        )}
      </div>

      {/* Row 3: Tags */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
        {currentRecord.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5"
          >
            {tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {isAddingTag && (
          <input
            ref={tagInputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={handleTagInputBlur}
            placeholder="输入标签，Enter 确认"
            className="text-xs outline-none bg-transparent text-gray-600 placeholder-gray-300 min-w-[110px]"
          />
        )}

        {!isAddingTag && (
          <button
            onClick={openTagInput}
            className="inline-flex items-center gap-0.5 text-xs text-gray-400 border border-dashed border-gray-300 rounded-full px-2 py-0.5 hover:border-gray-400 hover:text-gray-500 transition-colors"
          >
            <span className="text-[11px] leading-none">＋</span>
            添加标签
          </button>
        )}
      </div>

      {/* Share modal */}
      {shareOpen && (
        <ShareModal
          resourceTitle={currentRecord.title || "此实验记录"}
          recipients={shares.recipients}
          onAdd={shares.addShare}
          onRemove={shares.removeShare}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
