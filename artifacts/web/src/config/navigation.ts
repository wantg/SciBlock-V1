import type { LucideIcon } from "lucide-react";
import { Home, Mail, Users, FileText, ClipboardList } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  Icon: LucideIcon;
}

// An optional inline action button that appears to the right of a group title.
export interface NavGroupAction {
  label: string;
  href: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  // When set, renders an action button (e.g. "+") next to the group title.
  action?: NavGroupAction;
}

// Top-level flat items (no group header).
export const TOP_NAV: NavItem[] = [
  { label: "主页", href: "/home", Icon: Home },
  { label: "消息", href: "/home/messages", Icon: Mail },
];

// Group sections rendered below the top nav.
// "个人" items are populated dynamically from useSciNotes — its static items array stays empty here.
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "团队",
    items: [
      { label: "成员管理", href: "/home/members", Icon: Users },
      { label: "周报管理", href: "/home/reports", Icon: ClipboardList },
    ],
  },
  {
    title: "个人",
    items: [], // injected at runtime by AppSidebar via useSciNotes
    action: { label: "新建 SciNote", href: "/personal/new-experiment" },
  },
];

// Static personal nav items (rendered in AppSidebar above SciNotes)
export const PERSONAL_STATIC_NAV: NavItem[] = [
  { label: "我的周报", href: "/personal/my-reports", Icon: FileText },
];
