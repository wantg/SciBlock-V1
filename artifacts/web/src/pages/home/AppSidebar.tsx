import React from "react";
import { useLocation, Link } from "wouter";
import { LayoutGrid, Plus, BookOpen } from "lucide-react";
import { TOP_NAV, NAV_GROUPS } from "@/config/navigation";
import { useSciNotes } from "@/hooks/useSciNotes";
import { useNewExperimentDraft } from "@/contexts/NewExperimentDraftContext";
import { NavLink } from "./NavLink";
import type { NavItem, NavGroup } from "@/config/navigation";

const DRAFT_FALLBACK = "未命名实验";

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
  const { notes } = useSciNotes();
  const { draftName } = useNewExperimentDraft();

  // The in-progress experiment initialization, shown at the top of 个人 when active.
  const draftItem: NavItem | null =
    draftName !== null
      ? {
          label: draftName.trim() || DRAFT_FALLBACK,
          href: "/personal/new-experiment",
          Icon: BookOpen,
        }
      : null;

  // Build the personal group items from SciNotes at render time.
  const sciNoteItems: NavItem[] = [
    ...(draftItem ? [draftItem] : []),
    ...notes.map((n) => ({
      label: n.title,
      href: `/personal/note/${n.id}`,
      Icon: BookOpen,
    })),
  ];

  // Merge static config with dynamic items for the "个人" group.
  const groups: NavGroup[] = NAV_GROUPS.map((g) =>
    g.title === "个人" ? { ...g, items: sciNoteItems } : g,
  );

  return (
    <aside className="w-52 flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col py-4">
      {/* Logo */}
      <div className="px-4 mb-5 flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
          <LayoutGrid size={13} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm tracking-tight">
          SciBlock
        </span>
      </div>

      {/* Top-level flat nav (主页, 消息) */}
      <nav className="px-2 flex flex-col gap-0.5">
        {TOP_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={location === item.href} />
        ))}
      </nav>

      {/* Group sections (团队, 个人) */}
      <div className="mt-4 flex flex-col gap-4 flex-1 overflow-y-auto px-2">
        {groups.map((group) => (
          <div key={group.title}>
            <GroupHeader group={group} />
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={location === item.href}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
