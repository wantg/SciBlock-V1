/**
 * AttachmentViewStrip — read-only attachment display for ontology item view cards.
 *
 * Replaces the old "N 个附件" plain-text stub in all four module view cards
 * (System / Prep / Operation / Measurement / Data).
 *
 * Behaviour:
 *   - Renders nothing when attachments = [].
 *   - Shows a collapsed summary row: [Paperclip] "N 个附件" [chevron].
 *   - Clicking expands a per-item list with thumbnail / type icon, type badge, size.
 *   - Images  → in-app lightbox on click or double-click.
 *   - Documents → in-app iframe overlay (blob URL converted from data URL) on
 *                 click (action button) or double-click (row).
 *   - Videos   → new browser tab on double-click.
 *
 * Storage safety net:
 *   localPreviewUrl may be undefined if the strip/restore in workbenchStorage
 *   failed (e.g. sessionStorage quota exceeded).  In that case this component
 *   falls back to calling loadAttBlob(att.id) directly so the overlay still
 *   opens for PDFs that were saved correctly to their own sessionStorage key.
 *
 * Does NOT contain any upload logic — upload stays in AttachmentArea.
 * Does NOT accept onChange — this is purely presentational.
 */

import React, { useState, useRef } from "react";
import {
  Paperclip,
  Image,
  Film,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
} from "lucide-react";
import type { AttachmentMeta, AttachmentType } from "@/types/ontologyModules";
import {
  dataUrlToBlobUrl,
  resolveAttachmentSrc,
} from "@/data/attachmentStorage";
import { formatSize } from "@/data/attachmentUtils";

function TypeIcon({ type }: { type: AttachmentType }) {
  const cls = "w-3.5 h-3.5";
  if (type === "image") return <Image className={cls} />;
  if (type === "video") return <Film className={cls} />;
  return <FileText className={cls} />;
}

const TYPE_BADGE: Record<AttachmentType, string> = {
  image:    "bg-blue-50 text-blue-600",
  video:    "bg-violet-50 text-violet-600",
  document: "bg-gray-100 text-gray-500",
};

const TYPE_LABEL: Record<AttachmentType, string> = {
  image:    "图片",
  video:    "视频",
  document: "文档",
};

const ICON_CONTAINER: Record<AttachmentType, string> = {
  image:    "bg-blue-50 border-blue-200 text-blue-400",
  video:    "bg-violet-50 border-violet-200 text-violet-400",
  document: "bg-gray-100 border-gray-200 text-gray-400",
};

// ---------------------------------------------------------------------------
// ImageLightbox
// ---------------------------------------------------------------------------

interface LightboxProps {
  src: string;
  name: string;
  onClose: () => void;
}

function ImageLightbox({ src, name, onClose }: LightboxProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={name}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />

        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/50 hover:bg-black/70 text-white rounded p-1.5 transition-colors"
            title="在新标签页打开"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </a>
          <button
            onClick={onClose}
            className="bg-black/50 hover:bg-black/70 text-white rounded p-1.5 transition-colors"
            title="关闭（或点击背景关闭）"
          >
            <X size={14} />
          </button>
        </div>

        {name && (
          <p className="absolute bottom-0 left-0 right-0 text-center text-xs text-white/80 py-2 bg-gradient-to-t from-black/50 to-transparent rounded-b-lg pointer-events-none">
            {name}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AttachmentViewStrip
// ---------------------------------------------------------------------------

interface Props {
  attachments: AttachmentMeta[];
}

export function AttachmentViewStrip({ attachments }: Props) {
  const [expanded, setExpanded] = useState(false);

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>("");

  const [docViewerSrc, setDocViewerSrc] = useState<string | null>(null);
  const [docViewerName, setDocViewerName] = useState<string>("");
  const docBlobUrlRef = useRef<string | null>(null);

  // Brief user-visible feedback when no preview URL is available
  const [noUrlFeedback, setNoUrlFeedback] = useState(false);
  // Error feedback when blob conversion fails
  const [blobErrorFeedback, setBlobErrorFeedback] = useState(false);

  if (attachments.length === 0) return null;

  function openLightbox(att: AttachmentMeta) {
    const src = resolveAttachmentSrc(att);
    if (src) { setLightboxSrc(src); setLightboxName(att.name); }
  }

  function openDocViewer(att: AttachmentMeta) {
    // Resolve the attachment data URL (local → sessionStorage fallback → server URL)
    const src = resolveAttachmentSrc(att);
    if (!src) {
      // No URL available — show feedback
      setNoUrlFeedback(true);
      setTimeout(() => setNoUrlFeedback(false), 2200);
      return;
    }

    // Revoke any previously created blob URL
    if (docBlobUrlRef.current) {
      URL.revokeObjectURL(docBlobUrlRef.current);
      docBlobUrlRef.current = null;
    }

    // Browsers block data: URLs as iframe src (Chrome 60+ security policy).
    // Convert the data URL to a temporary blob URL for the iframe.
    if (src.startsWith("data:")) {
      const blobUrl = dataUrlToBlobUrl(src);
      if (!blobUrl) {
        // Conversion failed (malformed base64 etc.) — show error feedback
        setBlobErrorFeedback(true);
        setTimeout(() => setBlobErrorFeedback(false), 2500);
        return;
      }
      docBlobUrlRef.current = blobUrl;
      setDocViewerSrc(blobUrl);
    } else {
      // Already a server URL or blob URL — use directly
      setDocViewerSrc(src);
    }
    setDocViewerName(att.name);
  }

  function closeDocViewer() {
    if (docBlobUrlRef.current) {
      URL.revokeObjectURL(docBlobUrlRef.current);
      docBlobUrlRef.current = null;
    }
    setDocViewerSrc(null);
  }

  function openVideoExternal(att: AttachmentMeta) {
    const target = resolveAttachmentSrc(att);
    if (target) {
      window.open(target, "_blank", "noopener,noreferrer");
    } else {
      setNoUrlFeedback(true);
      setTimeout(() => setNoUrlFeedback(false), 2200);
    }
  }

  /**
   * Double-click handler for the attachment row <li>.
   *   image    → in-app lightbox
   *   document → in-app iframe overlay
   *   video    → new tab (blob URL — data URLs for video are too large)
   */
  function handleDoubleClick(att: AttachmentMeta) {
    if (att.type === "image") {
      openLightbox(att);
    } else if (att.type === "document") {
      openDocViewer(att);
    } else {
      openVideoExternal(att);
    }
  }

  /** Whether there is any preview URL available (in-memory, storage, or server). */
  function hasPreviewSource(att: AttachmentMeta): boolean {
    return resolveAttachmentSrc(att) !== null;
  }

  return (
    <div className="border-t border-gray-100 pt-1.5 mt-1">
      {/* ── Summary row (always visible) ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-700 transition-colors w-full text-left"
      >
        <Paperclip size={11} className="flex-shrink-0 text-gray-400" />
        <span className="font-medium">{attachments.length} 个附件</span>
        {expanded ? (
          <ChevronUp size={10} className="ml-auto text-gray-400" />
        ) : (
          <ChevronDown size={10} className="ml-auto text-gray-400" />
        )}
      </button>

      {/* ── Expanded list ── */}
      {expanded && (
        <ul className="flex flex-col gap-1 mt-1.5">
          {attachments.map((att) => {
            const preview = hasPreviewSource(att);
            return (
              <li
                key={att.id}
                onDoubleClick={() => handleDoubleClick(att)}
                className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 cursor-pointer select-none"
                title={
                  att.type === "image"
                    ? "双击预览图片"
                    : att.type === "document"
                    ? preview
                      ? "双击预览文档"
                      : "双击（文件数据不可用）"
                    : preview
                    ? "双击在新标签页打开视频"
                    : "双击（接入文件服务后可预览）"
                }
              >
                {/* Thumbnail for images; styled icon block for others */}
                {att.type === "image" && att.localPreviewUrl ? (
                  <button
                    type="button"
                    onClick={() => openLightbox(att)}
                    className="flex-shrink-0 rounded overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors cursor-zoom-in"
                    title="点击预览图片"
                  >
                    <img
                      src={att.localPreviewUrl}
                      alt={att.name}
                      className="w-8 h-8 object-cover"
                    />
                  </button>
                ) : (
                  <div
                    className={[
                      "w-8 h-8 rounded border flex items-center justify-center flex-shrink-0",
                      ICON_CONTAINER[att.type],
                    ].join(" ")}
                  >
                    <TypeIcon type={att.type} />
                  </div>
                )}

                {/* File name + type badge + size */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-700 truncate leading-snug block">
                    {att.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={[
                        "text-[10px] font-medium px-1 py-px rounded leading-none",
                        TYPE_BADGE[att.type],
                      ].join(" ")}
                    >
                      {TYPE_LABEL[att.type]}
                    </span>
                    {att.size !== undefined && (
                      <span className="text-[10px] text-gray-400">{formatSize(att.size)}</span>
                    )}
                  </div>
                </div>

                {/* Action button: type-specific */}
                {att.type === "image" ? (
                  <button
                    type="button"
                    onClick={() => openLightbox(att)}
                    disabled={!preview}
                    className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30 p-0.5 rounded"
                    title={preview ? "预览图片" : "暂无预览地址"}
                  >
                    <ExternalLink size={12} />
                  </button>
                ) : att.type === "document" ? (
                  <button
                    type="button"
                    onClick={() => openDocViewer(att)}
                    disabled={!preview}
                    className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30 p-0.5 rounded"
                    title={preview ? "预览文档" : "文件数据不可用"}
                  >
                    <ExternalLink size={12} />
                  </button>
                ) : (
                  // video → new tab
                  <button
                    type="button"
                    onClick={() => openVideoExternal(att)}
                    disabled={!preview}
                    className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30 p-0.5 rounded"
                    title={preview ? "在新标签页打开视频" : "接入文件服务后可预览"}
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Feedback messages ── */}
      {noUrlFeedback && (
        <p className="mt-1.5 text-[10px] text-amber-600 flex items-center gap-1">
          <span aria-hidden>⚠</span>
          接入文件服务后可预览
        </p>
      )}
      {blobErrorFeedback && (
        <p className="mt-1.5 text-[10px] text-red-500 flex items-center gap-1">
          <span aria-hidden>⚠</span>
          文件数据解析失败，请重新上传
        </p>
      )}

      {/* ── Image lightbox overlay ── */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          name={lightboxName}
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {/* ── Document / PDF in-app viewer overlay ── */}
      {docViewerSrc && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
          onClick={closeDocViewer}
        >
          <div
            className="relative w-[90vw] h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex-shrink-0 h-10 bg-gray-800 flex items-center justify-between px-3 gap-3">
              <span className="text-sm text-white truncate">{docViewerName}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => window.open(docViewerSrc, "_blank", "noopener,noreferrer")}
                  className="text-gray-300 hover:text-white transition-colors p-1 rounded"
                  title="在新标签页打开"
                >
                  <ExternalLink size={14} />
                </button>
                <button
                  type="button"
                  onClick={closeDocViewer}
                  className="text-gray-300 hover:text-white transition-colors p-1 rounded"
                  title="关闭"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {/* iframe — blob URL (converted from data URL) renders PDF natively */}
            <iframe
              src={docViewerSrc}
              className="flex-1 w-full border-none"
              title={docViewerName}
            />
          </div>
        </div>
      )}
    </div>
  );
}
