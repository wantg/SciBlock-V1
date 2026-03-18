/**
 * useMemberDetailPanelState — 成员详情页右侧面板的状态管理 hook。
 *
 * 职责：
 *  - 封装 selectedSciNote / selectedReport 两种选中状态
 *  - 强制互斥：选中其中一种时自动清除另一种
 *  - 对外暴露语义明确的处理函数，页面不接触 setState
 *
 * 设计约束：
 *  - 无副作用，无网络请求
 *  - 与具体 panel 组件解耦：只管理"选中了什么"，不管理"渲染什么"
 *
 * Layer: hooks
 */

import { useState } from "react";
import type { SciNote }       from "@/types/scinote";
import type { WeeklyReport }  from "@/types/weeklyReport";

export interface MemberDetailPanelState {
  selectedSciNote:   SciNote | null;
  selectedReport:    WeeklyReport | null;
  /** True when any panel is open (used by layout to switch to dual-column mode). */
  isDrilling:        boolean;
  handleSelectSciNote:  (note: SciNote) => void;
  handleSelectReport:   (report: WeeklyReport | null) => void;
  clearPanel:           () => void;
}

export function useMemberDetailPanelState(): MemberDetailPanelState {
  const [selectedSciNote, setSelectedSciNote] = useState<SciNote | null>(null);
  const [selectedReport,  setSelectedReport]  = useState<WeeklyReport | null>(null);

  const isDrilling = !!selectedSciNote || !!selectedReport;

  function handleSelectSciNote(note: SciNote) {
    // Toggle: re-clicking the same note closes the panel
    setSelectedSciNote((prev) => (prev?.id === note.id ? null : note));
    // Mutual exclusion
    setSelectedReport(null);
  }

  function handleSelectReport(report: WeeklyReport | null) {
    setSelectedReport(report);
    // Mutual exclusion: selecting a report closes any open SciNote panel
    if (report) setSelectedSciNote(null);
  }

  function clearPanel() {
    setSelectedSciNote(null);
    setSelectedReport(null);
  }

  return {
    selectedSciNote,
    selectedReport,
    isDrilling,
    handleSelectSciNote,
    handleSelectReport,
    clearPanel,
  };
}
