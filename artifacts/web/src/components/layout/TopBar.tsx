import React from "react";
import { Bell } from "lucide-react";
import { TimeDisplay } from "../ui/TimeDisplay";
import { IdentityBadge } from "./IdentityBadge";

interface Props {
  title: string;
}

export function TopBar({ title }: Props) {
  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-gray-100 bg-white flex-shrink-0">
      <span className="text-sm font-medium text-gray-700">{title}</span>

      <div className="flex items-center gap-4">
        <TimeDisplay />

        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        <IdentityBadge />

        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        <button
          aria-label="Notifications"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}
