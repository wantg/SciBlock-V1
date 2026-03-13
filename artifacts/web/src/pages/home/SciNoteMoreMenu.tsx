import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";

interface MenuItem {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  action: () => void;
  danger?: boolean;
}

interface Props {
  noteId: string;
  onRename: (noteId: string) => void;
  onReinitialize: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}

/**
 * SciNoteMoreMenu — "⋯" button that opens a fixed-position dropdown menu.
 *
 * Uses createPortal so the dropdown renders at document.body level,
 * avoiding any overflow or clipping issues from the sidebar's scroll container.
 */
export function SciNoteMoreMenu({ noteId, onRename, onReinitialize, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const MENU_ITEMS: MenuItem[] = [
    { icon: Pencil, label: "重命名", action: () => onRename(noteId) },
    { icon: RotateCcw, label: "重新初始化", action: () => onReinitialize(noteId) },
    { icon: Trash2, label: "删除", action: () => onDelete(noteId), danger: true },
  ];

  function handleTriggerClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Position the dropdown below and left-aligned with the trigger button.
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  }

  // Close on any outside click.
  useEffect(() => {
    if (!open) return;
    function onOutsideClick() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        title="更多操作"
        className={[
          "flex-shrink-0 p-1 mr-1 rounded transition-all duration-100",
          // Show faintly by default; clearly on row hover; always visible when menu is open.
          open
            ? "opacity-100 text-gray-600 bg-gray-100"
            : "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 hover:bg-gray-100",
        ].join(" ")}
      >
        <MoreHorizontal size={13} />
      </button>

      {open && menuPos &&
        createPortal(
          <div
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-36 bg-white rounded-lg border border-gray-100 shadow-lg py-1 text-sm"
          >
            {MENU_ITEMS.map(({ icon: Icon, label, action, danger }) => (
              <button
                key={label}
                onClick={(e) => {
                  e.stopPropagation();
                  action();
                  setOpen(false);
                }}
                className={[
                  "w-full flex items-center gap-2 px-3 py-1.5 transition-colors text-left",
                  danger
                    ? "text-red-500 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                <Icon size={13} className="flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
