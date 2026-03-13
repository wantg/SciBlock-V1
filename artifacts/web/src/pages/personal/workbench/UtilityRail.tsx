import React, { useState } from "react";
import {
  CalendarDays,
  Bot,
  History,
  Paperclip,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface RailItem {
  key: string;
  Icon: LucideIcon;
  label: string;
  panel: "calendar" | "ai" | "placeholder";
}

const RAIL_ITEMS: RailItem[] = [
  { key: "calendar", Icon: CalendarDays, label: "日历", panel: "calendar" },
  { key: "ai", Icon: Bot, label: "AI 助手", panel: "ai" },
  { key: "history", Icon: History, label: "历史实验", panel: "placeholder" },
  { key: "attachment", Icon: Paperclip, label: "附件", panel: "placeholder" },
  { key: "more", Icon: MoreHorizontal, label: "更多", panel: "placeholder" },
];

// ---------------------------------------------------------------------------
// Panel content
// ---------------------------------------------------------------------------

function PanelContent({ panelKey }: { panelKey: string }) {
  if (panelKey === "calendar") {
    return (
      <div className="p-3 text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">日历</p>
        <p className="text-gray-400">日期联动功能开发中</p>
      </div>
    );
  }
  if (panelKey === "ai") {
    return (
      <div className="p-3 text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">AI 助手</p>
        <p className="text-gray-400">AI 实时对话功能开发中</p>
      </div>
    );
  }
  return (
    <div className="p-3 text-xs text-gray-400">功能开发中</div>
  );
}

// ---------------------------------------------------------------------------
// UtilityRail
// ---------------------------------------------------------------------------

/**
 * UtilityRail — fixed-width rightmost column with icon-based tool buttons.
 * Width is fixed (~64px) and does not participate in focus-mode layout changes.
 */
export function UtilityRail() {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  function toggle(key: string) {
    setActiveKey((prev) => (prev === key ? null : key));
  }

  const activeItem = RAIL_ITEMS.find((i) => i.key === activeKey);

  return (
    <div className="flex flex-shrink-0">
      {/* Floating panel */}
      {activeItem && (
        <div className="w-44 border-l border-gray-100 bg-white flex-shrink-0">
          <PanelContent panelKey={activeItem.panel} />
        </div>
      )}

      {/* Icon column */}
      <div className="w-14 flex-shrink-0 border-l border-gray-100 bg-white flex flex-col items-center py-3 gap-1">
        {RAIL_ITEMS.map(({ key, Icon, label }) => (
          <button
            key={key}
            title={label}
            onClick={() => toggle(key)}
            className={[
              "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
              activeKey === key
                ? "bg-gray-900 text-white"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
            ].join(" ")}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
