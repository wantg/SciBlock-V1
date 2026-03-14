/**
 * AttachmentStatusBadge — colored status label for a single attachment.
 *
 * Layer: Shared UI component.
 *
 * Two modes:
 *   View mode  (onChange = undefined): displays the badge read-only.
 *              Renders nothing when status is undefined.
 *   Edit mode  (onChange provided):    badge is a button; clicking cycles
 *              through the status values:
 *                undefined → 待确认 → 合格 → 不合格 → undefined
 *              When status is undefined a neutral "标注" trigger is shown
 *              so the user knows the control exists.
 *
 * Status → color mapping (defined in attachmentUtils):
 *   合格   → green
 *   不合格  → red
 *   待确认  → yellow
 */

import React from "react";
import type { AttachmentStatus } from "@/types/ontologyModules";
import {
  ATTACHMENT_STATUS_CONFIG,
  nextAttachmentStatus,
} from "@/data/attachmentUtils";

interface Props {
  status?: AttachmentStatus;
  /** Provide to make the badge interactive (edit mode). Omit for read-only. */
  onChange?: (next: AttachmentStatus | undefined) => void;
}

export function AttachmentStatusBadge({ status, onChange }: Props) {
  const isEditable = onChange !== undefined;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (onChange) onChange(nextAttachmentStatus(status));
  }

  if (!isEditable) {
    if (!status) return null;
    const cfg = ATTACHMENT_STATUS_CONFIG[status];
    return (
      <span
        className={[
          "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none flex-shrink-0",
          cfg.badgeCls,
        ].join(" ")}
      >
        <span className={["w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dotCls].join(" ")} />
        {cfg.label}
      </span>
    );
  }

  if (!status) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-0.5 text-[10px] text-gray-300 hover:text-gray-500 transition-colors leading-none flex-shrink-0 rounded px-1 py-0.5 hover:bg-gray-100"
        title="点击标注附件状态（待确认 → 合格 → 不合格 → 清除）"
      >
        <span className="w-1.5 h-1.5 rounded-full border border-current flex-shrink-0" />
        标注
      </button>
    );
  }

  const cfg = ATTACHMENT_STATUS_CONFIG[status];
  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none flex-shrink-0 transition-opacity hover:opacity-70",
        cfg.badgeCls,
      ].join(" ")}
      title="点击切换状态（待确认 → 合格 → 不合格 → 清除）"
    >
      <span className={["w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dotCls].join(" ")} />
      {cfg.label}
    </button>
  );
}
