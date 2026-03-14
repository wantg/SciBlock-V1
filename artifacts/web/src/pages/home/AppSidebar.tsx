import React from "react";
import { useLocation, Link } from "wouter";
import { LayoutGrid, Plus, BookOpen, Trash2 } from "lucide-react";
import { TOP_NAV, NAV_GROUPS } from "@/config/navigation";
import { useSciNoteStore } from "@/contexts/SciNoteStoreContext";
import { useNewExperimentDraft } from "@/contexts/NewExperimentDraftContext";
import { useSciNoteActions } from "@/hooks/useSciNoteActions";
import { useTrash } from "@/contexts/TrashContext";
import { useMessages } from "@/contexts/MessagesContext";
import { NavLink } from "./NavLink";
import { SciNoteRow } from "./SciNoteRow";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { NavItem, NavGroup } from "@/config/navigation";

const DRAFT_FALLBACK = "未命名实验";

function sciNoteHref(kind: "placeholder" | "wizard", id: string): string {
  return kind === "wizard" ? `/personal/experiment/${id}` : `/personal/note/${id}`;
}

function GroupHeader({ group }: { group: NavGroup }) {
  return (
    <div className="flex items-center justify-between px-3 mb-1">
      <span className="text-xs font-medium text-gray-400 tracking-wide">
        {group.title}
      </span>
      {group.action && (
        <Link
          href={group.action.href}
          title={group.action.label}
          className="text-gray-400 hover:text-gray-700 transition-colors rounded p-0.5 hover:bg-gray-100"
        >
          <Plus size={13} />
        </Link>
      )}
    </div>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { notes } = useSciNoteStore();
  const { draftName } = useNewExperimentDraft();
  const actions = useSciNoteActions();
  const { trashedRecords } = useTrash();

  const { unreadCount } = useMessages();
  const trashCount = trashedRecords.length;
  const trashActive = location === "/personal/trash";

  const draftItem: NavItem | null =
    draftName !== null
      ? { label: draftName.trim() || DRAFT_FALLBACK, href: "/personal/new-experiment", Icon: BookOpen }
      : null;

  const groups: NavGroup[] = NAV_GROUPS.map((g) =>
    g.title === "个人" ? { ...g, items: draftItem ? [draftItem] : [] } : g,
  );

  return (
    <aside className="w-52 flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col py-4">
      {/* Logo */}
      <div className="px-4 mb-5 flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
          <LayoutGrid size={13} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm tracking-tight">SciBlock</span>
      </div>

      {/* Top-level flat nav */}
      <nav className="px-2 flex flex-col gap-0.5">
        {TOP_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={location === item.href}
            badge={item.href === "/home/messages" ? unreadCount : undefined}
          />
        ))}
      </nav>

      {/* Group sections */}
      <div className="mt-4 flex flex-col gap-4 flex-1 overflow-y-auto px-2">
        {groups.map((group) => (
          <div key={group.title}>
            <GroupHeader group={group} />
            <div className="flex flex-col gap-0.5">

              {/* In-progress wizard draft (no more-menu) */}
              {group.title === "个人" && draftItem && (
                <NavLink
                  key={draftItem.href}
                  item={draftItem}
                  active={location === draftItem.href}
                />
              )}

              {/* Saved SciNotes */}
              {group.title === "个人" &&
                notes.map((note) => {
                  const href = sciNoteHref(note.kind, note.id);
                  return (
                    <SciNoteRow
                      key={note.id}
                      noteId={note.id}
                      title={note.title}
                      href={href}
                      active={location === href}
                      isRenaming={actions.renamingNoteId === note.id}
                      onRenameRequest={actions.renameRequest}
                      onRenameCommit={(newTitle) => actions.renameCommit(note.id, newTitle)}
                      onRenameCancel={actions.renameCancel}
                      onReinitialize={actions.reinitHandlers.request}
                      onDelete={actions.deleteHandlers.request}
                    />
                  );
                })}

              {/* Trash — at the bottom of the 个人 section */}
              {group.title === "个人" && (
                <Link
                  href="/personal/trash"
                  className={[
                    "flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors",
                    trashActive
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2.5">
                    <Trash2 size={15} className="flex-shrink-0" />
                    回收站
                  </span>
                  {trashCount > 0 && (
                    <span className="text-[10px] bg-gray-200 text-gray-500 rounded-full px-1.5 py-0.5 font-medium leading-none">
                      {trashCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Other groups (团队, etc.) */}
              {group.title !== "个人" &&
                group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={location === item.href} />
                ))}

            </div>
          </div>
        ))}
      </div>

      {/* Reinitialize confirmation */}
      <ConfirmDialog
        open={actions.reinitConfirmOpen}
        title="重新初始化"
        description={
          actions.reinitNote
            ? `将清空「${actions.reinitNote.title}」的初始化内容，重新填写步骤 1–6。名称将被保留，该 SciNote 不会被删除。`
            : "将清空当前 SciNote 的初始化内容，但不会删除该 SciNote。确认继续？"
        }
        confirmLabel="确认重新初始化"
        cancelLabel="取消"
        danger
        onConfirm={actions.reinitHandlers.confirm}
        onCancel={actions.reinitHandlers.cancel}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={actions.deleteConfirmOpen}
        title="删除 SciNote"
        description={
          actions.deleteNote
            ? `「${actions.deleteNote.title}」将被永久删除，包含其所有初始化数据及实验记录。此操作不可撤销。`
            : "该 SciNote 将被永久删除，此操作不可撤销。"
        }
        confirmLabel="确认删除"
        cancelLabel="取消"
        danger
        onConfirm={actions.deleteHandlers.confirm}
        onCancel={actions.deleteHandlers.cancel}
      />
    </aside>
  );
}
