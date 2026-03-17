import React from "react";
import { Bell } from "lucide-react";
import { TimeDisplay } from "../ui/TimeDisplay";
import { IdentityBadge } from "./IdentityBadge";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  title: string;
  /** 可选的面包屑导航，提供时优先显示 */
  breadcrumb?: BreadcrumbItem[];
}

export function TopBar({ title, breadcrumb }: Props) {
  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-gray-100 bg-white flex-shrink-0">
      {breadcrumb ? (
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="text-gray-300 mx-2 text-xs">/</span>
              )}
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="font-medium text-gray-900">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : (
        <span className="text-sm font-medium text-gray-700">{title}</span>
      )}

      <div className="flex items-center gap-4">
        <TimeDisplay />

        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        <IdentityBadge />

        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        <button
          aria-label="Notifications"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}
