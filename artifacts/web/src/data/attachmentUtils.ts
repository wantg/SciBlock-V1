/**
 * attachmentUtils — pure utility functions for attachment metadata.
 *
 * Layer: Utility (no React, no DOM, no storage imports).
 * Used by: AttachmentArea, AttachmentViewStrip, attachmentStorage.
 */

import type { AttachmentType, AttachmentStatus } from "@/types/ontologyModules";

// ---------------------------------------------------------------------------
// Attachment status config
// ---------------------------------------------------------------------------

/** Per-value display config — badge background/border/text + dot color. */
export const ATTACHMENT_STATUS_CONFIG: Record<
  AttachmentStatus,
  { label: string; badgeCls: string; dotCls: string }
> = {
  合格:  { label: "合格",  badgeCls: "bg-green-50  text-green-700  border border-green-200",  dotCls: "bg-green-500"  },
  不合格: { label: "不合格", badgeCls: "bg-red-50    text-red-700    border border-red-200",    dotCls: "bg-red-500"    },
  待确认: { label: "待确认", badgeCls: "bg-yellow-50 text-yellow-700 border border-yellow-200", dotCls: "bg-yellow-500" },
  完成:  { label: "完成",  badgeCls: "bg-blue-50   text-blue-700   border border-blue-200",   dotCls: "bg-blue-500"   },
  异常:  { label: "异常",  badgeCls: "bg-orange-50 text-orange-700 border border-orange-200", dotCls: "bg-orange-500" },
};

/**
 * Grouped options shown in the dropdown selector.
 * 待确认 intentionally appears in both groups as it is a valid value for each.
 */
export const ATTACHMENT_STATUS_GROUPS: {
  label: string;
  options: AttachmentStatus[];
}[] = [
  { label: "质量评估", options: ["合格", "不合格", "待确认"] },
  { label: "状态评估", options: ["完成", "待确认", "异常"] },
];

/** Detect the attachment type from a File's MIME type. */
export function detectType(file: File): AttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

/** Format a byte count into a human-readable size string. */
export function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Generate a unique attachment ID. */
export function makeAttId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Convert a File to a base64 data URL. Resolves in-memory — no server needed. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
