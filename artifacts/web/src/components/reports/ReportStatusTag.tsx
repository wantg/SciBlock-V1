import React from "react";
import type { WeeklyReportStatus } from "@/types/weeklyReport";

const CONFIG: Record<
  WeeklyReportStatus,
  { label: string; cls: string }
> = {
  draft:           { label: "草稿",   cls: "bg-gray-100 text-gray-500" },
  submitted:       { label: "已提交", cls: "bg-blue-100 text-blue-700" },
  under_review:    { label: "审阅中", cls: "bg-yellow-100 text-yellow-700" },
  needs_revision:  { label: "待修改", cls: "bg-red-100 text-red-700" },
  reviewed:        { label: "已批阅", cls: "bg-green-100 text-green-700" },
};

interface Props {
  status: WeeklyReportStatus | string;
  size?: "sm" | "md";
}

export function ReportStatusTag({ status, size = "sm" }: Props) {
  const cfg = CONFIG[status as WeeklyReportStatus] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  const px = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  return (
    <span className={`inline-flex items-center rounded-full text-xs font-medium ${px} ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
