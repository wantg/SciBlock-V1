import React, { useRef } from "react";
import { Paperclip, Image, Film, FileText, X } from "lucide-react";
import type { AttachmentMeta, AttachmentStatus, AttachmentType } from "@/types/ontologyModules";
import {
  detectType,
  formatSize,
  makeAttId,
  readFileAsDataUrl,
} from "@/data/attachmentUtils";
import { AttachmentStatusBadge } from "./AttachmentStatusBadge";

// ---------------------------------------------------------------------------
// Type icon
// ---------------------------------------------------------------------------

function AttachmentIcon({ type }: { type: AttachmentType }) {
  const cls = "w-3.5 h-3.5 flex-shrink-0";
  if (type === "image")    return <Image    className={cls} />;
  if (type === "video")    return <Film     className={cls} />;
  return                          <FileText className={cls} />;
}

// ---------------------------------------------------------------------------
// AttachmentArea
// ---------------------------------------------------------------------------

interface Props {
  attachments: AttachmentMeta[];
  onChange: (attachments: AttachmentMeta[]) => void;
}

/**
 * AttachmentArea — per-item attachment section rendered inside ontology item
 * edit cards.  Handles file upload only — viewing is handled by AttachmentViewStrip.
 *
 * Capabilities:
 *   - Upload any file via a hidden <input type="file" multiple>
 *   - image / document → data URL (base64, persists across page refresh)
 *   - video            → blob URL (data URLs are too large; in-session only)
 *   - Files can be removed; blob URLs are revoked to free memory
 *
 * When real upload infrastructure is added, replace the readFileAsDataUrl call
 * with an async upload → server URL resolution step and set att.url.
 */
export function AttachmentArea({ attachments, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Convert files to data URLs (base64) so the preview survives
   * localStorage serialisation and page refreshes.
   *
   * Strategy:
   *   image / document → data URL  (persists across refresh, works in iframe)
   *   video            → blob URL  (data URLs are too large for localStorage;
   *                                  accepted limitation: in-session only)
   *
   * When real upload infra lands, replace this with async upload → server URL.
   */
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newItems: AttachmentMeta[] = [];
    for (const file of Array.from(files)) {
      const type = detectType(file);
      const localPreviewUrl =
        type === "video"
          ? URL.createObjectURL(file)          // blob — large videos can't be base64'd in localStorage
          : await readFileAsDataUrl(file);     // data URL — persists across page refresh
      newItems.push({
        id: makeAttId(),
        name: file.name,
        type,
        localPreviewUrl,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }

    onChange([...attachments, ...newItems]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(att: AttachmentMeta) {
    // Only blob URLs need explicit revocation; data URLs are plain strings
    if (att.localPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(att.localPreviewUrl);
    }
    onChange(attachments.filter((a) => a.id !== att.id));
  }

  function setStatus(att: AttachmentMeta, status: AttachmentStatus | undefined) {
    onChange(
      attachments.map((a) => (a.id === att.id ? { ...a, status } : a)),
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 mt-1">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
          <Paperclip size={11} />
          附件
          {attachments.length > 0 && (
            <span className="ml-1 text-gray-300">({attachments.length})</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[11px] text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-0.5"
        >
          + 上传
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 group"
            >
              {/* Thumbnail for images */}
              {att.type === "image" && att.localPreviewUrl ? (
                <img
                  src={att.localPreviewUrl}
                  alt={att.name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-200"
                />
              ) : (
                <span className="w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-400">
                  <AttachmentIcon type={att.type} />
                </span>
              )}

              {/* Name + meta */}
              <div className="flex-1 min-w-0 flex flex-col gap-0">
                <span className="text-xs text-gray-700 truncate leading-snug">
                  {att.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={[
                      "text-[10px] font-medium px-1 py-0 rounded leading-none",
                      att.type === "image"    ? "bg-blue-50 text-blue-600"   :
                      att.type === "video"    ? "bg-violet-50 text-violet-600" :
                                                "bg-gray-100 text-gray-500",
                    ].join(" ")}
                  >
                    {att.type === "image" ? "图片" : att.type === "video" ? "视频" : "文档"}
                  </span>
                  {att.size && (
                    <span className="text-[10px] text-gray-400">{formatSize(att.size)}</span>
                  )}
                </div>
              </div>

              {/* Status badge — clickable in edit mode */}
              <AttachmentStatusBadge
                status={att.status}
                onChange={(next) => setStatus(att, next)}
              />

              {/* Delete */}
              <button
                type="button"
                onClick={() => remove(att)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5 rounded"
                title="删除附件"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
