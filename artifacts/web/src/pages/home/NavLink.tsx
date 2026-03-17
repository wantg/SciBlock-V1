import React from "react";
import { Link } from "wouter";
import type { NavItem } from "@/config/navigation";

interface Props {
  item: NavItem;
  active: boolean;
  /** Optional badge count (e.g. unread messages). Hidden when 0 or undefined. */
  badge?: number;
}

export function NavLink({ item, active, badge }: Props) {
  const { Icon, label, href } = item;
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer",
        active
          ? "bg-gray-100 text-gray-900 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      ].join(" ")}
    >
      <Icon size={16} className="text-gray-400 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[10px] bg-gray-900 text-white rounded-full px-1.5 py-0.5 font-medium leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
