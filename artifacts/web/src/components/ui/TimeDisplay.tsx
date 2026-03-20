/**
 * TimeDisplay — 可复用实时时钟组件
 *
 * Layer: UI component (controlled via props + internal useDateTime hook)
 *
 * 功能:
 *   - 显示当前日期与时间，每秒自动更新
 *   - 点击时间部分切换 24h / 12h 制（偏好持久化）
 *   - 通过 props 控制显示模式（date-time | date | time）
 *
 * 用法:
 *   <TimeDisplay />                        // 默认: 日期 + 时间，24h 制
 *   <TimeDisplay mode="time" />            // 仅时间
 *   <TimeDisplay mode="date" />            // 仅日期
 *
 * 扩展:
 *   - 新增 locale / timezone prop: 修改 useDateTime 的 formatTime 调用即可
 *   - 新增更多格式: 在 displayStr 计算段中添加 case
 */

import React from "react";
import { Clock } from "lucide-react";
import { useDateTime } from "../../hooks/useDateTime";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TimeDisplayMode = "date-time" | "date" | "time";

interface Props {
  /** What to display. Default: "date-time" */
  mode?: TimeDisplayMode;
  /** Custom CSS class for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeDisplay({ mode = "date-time", className = "" }: Props) {
  const { dateStr, timeStr, hour12, toggleHour12 } = useDateTime();

  const dateNode = (
    <span className="tabular-nums tracking-wide">{dateStr}</span>
  );

  const timeNode = (
    <button
      onClick={toggleHour12}
      title={hour12 ? "当前: 12小时制，点击切换为24小时制" : "当前: 24小时制，点击切换为12小时制"}
      className="tabular-nums tracking-wide hover:text-gray-800 transition-colors focus:outline-none cursor-pointer"
    >
      {timeStr}
    </button>
  );

  const content = (() => {
    switch (mode) {
      case "date":
        return dateNode;
      case "time":
        return timeNode;
      case "date-time":
      default:
        return (
          <>
            {dateNode}
            <span className="text-gray-300 select-none mx-1">·</span>
            {timeNode}
          </>
        );
    }
  })();

  return (
    <div
      className={[
        "flex items-center gap-1.5 text-[11px] font-mono text-gray-500 select-none",
        className,
      ].join(" ")}
    >
      <Clock size={11} className="text-gray-400 flex-shrink-0" />
      {content}
    </div>
  );
}
