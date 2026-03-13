import React from "react";
import { useLocation, Link } from "wouter";
import {
  Home,
  Mail,
  Users,
  FileText,
  LayoutGrid,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const TOP_NAV: NavItem[] = [
  { label: "主页", href: "/home", icon: <Home size={16} /> },
  { label: "消息", href: "/home/messages", icon: <Mail size={16} /> },
];

const TEAM_NAV: NavItem[] = [
  { label: "Members", href: "/home/members", icon: <Users size={16} /> },
  { label: "Reports", href: "/home/reports", icon: <FileText size={16} /> },
];

// Personal section is intentionally empty — hidden when no items
const PERSONAL_NAV: NavItem[] = [];

const GROUPS: NavGroup[] = [
  { title: "团队", items: TEAM_NAV },
  { title: "个人", items: PERSONAL_NAV },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={[
        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-gray-100 text-gray-900 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      ].join(" ")}
    >
      <span className="text-gray-400 flex-shrink-0">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-52 flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col py-4">
      {/* Logo */}
      <div className="px-4 mb-5 flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
          <LayoutGrid size={13} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm tracking-tight">SciBlock</span>
      </div>

      {/* Top nav */}
      <nav className="px-2 flex flex-col gap-0.5">
        {TOP_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={location === item.href} />
        ))}
      </nav>

      {/* Groups */}
      <div className="mt-4 flex flex-col gap-4 flex-1 overflow-y-auto px-2">
        {GROUPS.filter((g) => g.items.length > 0).map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1 text-xs font-medium text-gray-400 tracking-wide">
              {group.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} active={location === item.href} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
