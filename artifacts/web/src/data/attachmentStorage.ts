/**
 * attachmentStorage — per-attachment data URL persistence and retrieval.
 *
 * Layer: Data Access (sessionStorage).
 *
 * Problem solved:
 *   Workbench records are saved to sessionStorage as a single JSON blob.
 *   Base64 data URLs for images/PDFs can be several MB each.
 *   When embedded inside the records JSON the combined size can exceed the
 *   sessionStorage quota (~5 MB); the setItem call throws, is silently caught,
 *   and the entire save is lost.
 *
 * Solution:
 *   Strip data URLs from the records JSON before saving (keeps the JSON small).
 *   Save each data URL under its own sessionStorage key: "sciblock:att:{id}".
 *   Restore data URLs from those separate keys after loading.
 *   A single large attachment failing to save does NOT affect the others.
 *
 * Exports (also used by AttachmentViewStrip as a safety-net fallback):
 *   saveAttBlob / loadAttBlob / deleteAttBlob — raw sessionStorage I/O
 *   dataUrlToBlobUrl   — data URL → temporary blob URL for iframe src
 *   resolveAttachmentSrc — unified URL resolution with in-memory + storage fallback
 */

import type { AttachmentMeta } from "@/types/ontologyModules";

const ATT_PREFIX = "sciblock:att:";

// ---------------------------------------------------------------------------
// Raw sessionStorage I/O
// ---------------------------------------------------------------------------

/** Save one attachment's data URL under its own sessionStorage key.
 *  Returns false if the save fails (quota exceeded — file too large). */
export function saveAttBlob(id: string, dataUrl: string): boolean {
  try {
    sessionStorage.setItem(ATT_PREFIX + id, dataUrl);
    return true;
  } catch {
    return false;
  }
}

/** Load a saved attachment data URL by ID. Returns null when not found. */
export function loadAttBlob(id: string): string | null {
  try {
    return sessionStorage.getItem(ATT_PREFIX + id);
  } catch {
    return null;
  }
}

/** Remove a saved attachment data URL (call when the attachment is deleted). */
export function deleteAttBlob(id: string): void {
  try { sessionStorage.removeItem(ATT_PREFIX + id); } catch {}
}

// ---------------------------------------------------------------------------
// URL resolution and conversion
// ---------------------------------------------------------------------------

/**
 * Convert a data URL (base64) to a temporary blob URL suitable for iframe src.
 *
 * Browsers block `data:` URLs as iframe src (Chrome 60+ security policy).
 * Files are stored as data URLs for sessionStorage persistence but must be
 * converted to blob URLs just before rendering inside an <iframe>.
 *
 * Returns null on any failure (malformed data URL, atob error, quota, etc.).
 * The caller is responsible for revoking the returned blob URL via URL.revokeObjectURL().
 */
export function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

/**
 * Resolve the best available preview URL for an attachment.
 *
 * Priority order:
 *   1. att.localPreviewUrl  — in-memory data URL (React state, fastest)
 *   2. loadAttBlob(att.id)  — sessionStorage fallback (if React state restore failed)
 *   3. att.url              — server URL (available after real file upload infra)
 *
 * Returns null when no URL is available at all.
 */
export function resolveAttachmentSrc(att: AttachmentMeta): string | null {
  if (att.localPreviewUrl) return att.localPreviewUrl;
  const stored = loadAttBlob(att.id);
  if (stored) return stored;
  if (att.url) return att.url;
  return null;
}
