/**
 * attachmentUtils — pure utility functions for attachment metadata.
 *
 * Layer: Utility (no React, no DOM, no storage imports).
 * Used by: AttachmentArea, AttachmentViewStrip, attachmentStorage.
 */

import type { AttachmentType } from "@/types/ontologyModules";

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
