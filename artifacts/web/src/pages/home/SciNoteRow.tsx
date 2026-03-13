import React from "react";
import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import { SciNoteMoreMenu } from "./SciNoteMoreMenu";

interface Props {
  noteId: string;
  title: string;
  href: string;
  active: boolean;
  onRename: (noteId: string) => void;
  onReinitialize: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}

/**
 * SciNoteRow — a sidebar list item for a saved SciNote.
 *
 * Layout:
 *   [BookOpen icon] [truncated title ........] [⋯ more-menu]
 *
 * The "⋯" button is invisible by default and revealed on hover via the
 * "group" class on the wrapper. The SciNoteMoreMenu handles its own
 * fixed-position dropdown so it is never clipped by the sidebar's scroll container.
 */
export function SciNoteRow({
  noteId,
  title,
  href,
  active,
  onRename,
  onReinitialize,
  onDelete,
}: Props) {
  return (
    <div
      className={[
        "group flex items-center rounded-lg transition-colors",
        active ? "bg-gray-100" : "hover:bg-gray-50",
      ].join(" ")}
    >
      {/* Navigation link — takes up all remaining space */}
      <Link
        href={href}
        className={[
          "flex-1 flex items-center gap-2.5 px-3 py-1.5 text-sm min-w-0 transition-colors",
          active ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900",
        ].join(" ")}
      >
        <BookOpen size={16} className="text-gray-400 flex-shrink-0" />
        <span className="truncate">{title}</span>
      </Link>

      {/* More-actions menu — revealed on row hover */}
      <SciNoteMoreMenu
        noteId={noteId}
        onRename={onRename}
        onReinitialize={onReinitialize}
        onDelete={onDelete}
      />
    </div>
  );
}
