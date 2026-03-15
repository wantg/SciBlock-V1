import React from "react";
import type { WeeklyReportContent } from "@/types/weeklyReport";

const FIELDS: { key: keyof WeeklyReportContent; label: string }[] = [
  { key: "completed",    label: "本周完成内容" },
  { key: "progress",     label: "当前实验进展" },
  { key: "problems",     label: "遇到的问题" },
  { key: "nextWeekPlan", label: "下周计划" },
  { key: "helpNeeded",   label: "需要导师帮助的事项" },
];

interface Props {
  content: WeeklyReportContent;
}

export function ReportContentView({ content }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {FIELDS.map(({ key, label }) => {
        const text = content[key];
        if (!text && key === "helpNeeded") return null;
        return (
          <div key={key}>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {label}
            </h4>
            {text ? (
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">（未填写）</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
