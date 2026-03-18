/**
 * MemberDetailLayout — 成员详情页的双栏布局容器。
 *
 * Layer: layout component (pure presentational — no state, no data fetching).
 *
 * 两种模式：
 *   单栏模式 (rightPanel = null)：
 *     内容区整体可滚动，内容宽度 max-w-2xl。
 *
 *   双栏模式 (rightPanel = ReactNode)：
 *     左栏 (flex-1)：成员详情，独立滚动，内容宽度 max-w-xl
 *     右栏 (w-400px)：右侧面板，独立滚动，白色背景
 *
 * 设计约束：
 *  - 本组件不知道右侧面板是什么（实验记录 or 周报 or 未来新增的面板类型）
 *  - 布局切换完全由 rightPanel prop 驱动，父组件只需传入 null 或组件节点
 *  - 面包屑栏始终全宽置顶，不参与双栏布局
 */

import type { ReactNode } from "react";

interface Props {
  /** 全宽面包屑栏内容。 */
  breadcrumb: ReactNode;
  /**
   * 右侧面板内容。
   *  - null  → 单栏模式（整体滚动）
   *  - node  → 双栏模式（左右各自独立滚动）
   */
  rightPanel: ReactNode | null;
  /** 左栏主内容，由各个 section 卡片组成。 */
  children: ReactNode;
}

export function MemberDetailLayout({ breadcrumb, rightPanel, children }: Props) {
  const isDrilling = rightPanel !== null;

  const contentArea = (
    <div
      className={[
        "px-6 py-5 w-full flex flex-col gap-6",
        isDrilling ? "max-w-xl mx-auto" : "max-w-2xl mx-auto",
      ].join(" ")}
    >
      {children}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/70">

      {/* ── 面包屑栏 — 始终全宽置顶 ──────────────────────────── */}
      <div className="flex-shrink-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-2.5">
        {breadcrumb}
      </div>

      {/* ── 内容区 ─────────────────────────────────────────────── */}
      {!isDrilling ? (

        // 单栏：整体滚动
        <div className="flex-1 overflow-y-auto">
          {contentArea}
        </div>

      ) : (

        // 双栏：左右各自独立滚动
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* 左栏：详情内容 */}
          <div className="flex-1 overflow-y-auto border-r border-gray-100 min-w-0">
            {contentArea}
          </div>

          {/* 右栏：由父组件传入的面板 */}
          <div className="w-[400px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
            {rightPanel}
          </div>

        </div>
      )}

    </div>
  );
}
