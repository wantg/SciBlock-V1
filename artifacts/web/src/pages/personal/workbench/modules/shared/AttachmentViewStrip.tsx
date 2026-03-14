/**
 * AttachmentViewStrip — read-only attachment display for ontology item view cards.
 *
 * Replaces the old "N 个附件" plain-text stub in all four module view cards
 * (Prep / Operation / Measurement / Data).
 *
 * Behaviour:
 *   - Renders nothing when attachments = [].
 *   - Shows a collapsed summary row: [Paperclip] "N 个附件" [chevron].
 *   - Clicking expands a per-item list with thumbnail / type icon, type badge, size.
 *   - Images: thumbnail shows localPreviewUrl; click opens a full-screen lightbox.
 *     The lightbox also has a "open in new tab" button for copying the blob URL.
 *   - Videos / Documents: show a type icon; the ExternalLink button opens att.url
 *     or att.localPreviewUrl in a new tab.  Button is disabled (with tooltip) when
 *     no URL is available — expected in the current mock phase (no file server yet).
 *
 * Does NOT contain any upload logic — upload stays in AttachmentArea.
 * Does NOT accept onChange — this is purely presentational.
 */

import React, { useState } from "react";
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

// ---------------------------------------------------------------------------
// Shared helpers (mirrors the ones in AttachmentArea; kept local to avoid coupling)
// ---------------------------------------------------------------------------

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
      className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center"
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

        {/* Overlay controls — top-right */}
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

        {/* File name caption */}
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

  if (attachments.length === 0) return null;

  function openLightbox(att: AttachmentMeta) {
    const src = att.localPreviewUrl ?? att.url;
    if (src) {
      setLightboxSrc(src);
      setLightboxName(att.name);
    }
  }

  function openExternal(att: AttachmentMeta) {
    const target = att.url ?? att.localPreviewUrl;
    if (target) window.open(target, "_blank", "noopener,noreferrer");
  }

  function hasPreviewSource(att: AttachmentMeta): boolean {
    return !!(att.url ?? att.localPreviewUrl);
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
                className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5"
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

                {/* Action button: preview for images, open-external for docs/videos */}
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
                ) : (
                  <button
                    type="button"
                    onClick={() => openExternal(att)}
                    disabled={!preview}
                    className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30 p-0.5 rounded"
                    title={preview ? "在新标签页打开" : "接入文件服务后可预览"}
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Image lightbox overlay ── */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          name={lightboxName}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}
