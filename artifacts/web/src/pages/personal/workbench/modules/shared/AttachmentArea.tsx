import React, { useRef } from "react";
import { Paperclip, Image, Film, FileText, X } from "lucide-react";
import type { AttachmentMeta, AttachmentType } from "@/types/ontologyModules";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectType(file: File): AttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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
 * AttachmentArea — per-item attachment section rendered at the bottom of each
 * ontology item card during editing.
 *
 * Capabilities:
 *   - Upload any file via hidden <input type="file" multiple>
 *   - Images get a local blob preview URL (released on delete)
 *   - Each uploaded file creates an AttachmentMeta record (mock metadata; no
 *     server call in this phase — the `url` field is left undefined)
 *   - Files can be removed; their blob URLs are revoked to prevent leaks
 *
 * This is a pure client-side mock. When real upload infrastructure is added,
 * replace the onChange call inside handleFiles with an async upload + URL
 * resolution step and set `att.url` to the returned permanent URL.
 */
export function AttachmentArea({ attachments, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newItems: AttachmentMeta[] = [];
    for (const file of Array.from(files)) {
      const type = detectType(file);
      newItems.push({
        id: makeId(),
        name: file.name,
        type,
        localPreviewUrl: type === "image" ? URL.createObjectURL(file) : undefined,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }

    onChange([...attachments, ...newItems]);
    // Reset input so the same file can be re-selected if needed
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(att: AttachmentMeta) {
    // Revoke blob URL to free memory
    if (att.localPreviewUrl) {
      URL.revokeObjectURL(att.localPreviewUrl);
    }
    onChange(attachments.filter((a) => a.id !== att.id));
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
