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

/** Display config for each status value — used by AttachmentStatusBadge. */
export const ATTACHMENT_STATUS_CONFIG: Record<
  AttachmentStatus,
  { label: string; badgeCls: string; dotCls: string }
> = {
  合格:  { label: "合格",  badgeCls: "bg-green-50  text-green-700  border border-green-200",  dotCls: "bg-green-500"  },
  不合格: { label: "不合格", badgeCls: "bg-red-50    text-red-700    border border-red-200",    dotCls: "bg-red-500"    },
  待确认: { label: "待确认", badgeCls: "bg-yellow-50 text-yellow-700 border border-yellow-200", dotCls: "bg-yellow-500" },
};

/** Ordered cycle used when the user clicks to change status.
 *  undefined → 待确认 → 合格 → 不合格 → undefined */
export const ATTACHMENT_STATUS_CYCLE: (AttachmentStatus | undefined)[] = [
  undefined, "待确认", "合格", "不合格",
];

/** Return the next status in the cycle. */
export function nextAttachmentStatus(
  current: AttachmentStatus | undefined,
): AttachmentStatus | undefined {
  const idx = ATTACHMENT_STATUS_CYCLE.indexOf(current);
  return ATTACHMENT_STATUS_CYCLE[(idx + 1) % ATTACHMENT_STATUS_CYCLE.length];
}

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
