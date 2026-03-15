import React from "react";
import type { WeeklyReportContent } from "@/types/weeklyReport";

interface FieldConfig {
  key: keyof WeeklyReportContent;
  label: string;
  placeholder: string;
  required?: boolean;
}

const FIELDS: FieldConfig[] = [
  { key: "completed",    label: "本周完成内容",     placeholder: "描述本周完成的主要工作...", required: true },
  { key: "progress",     label: "当前实验进展",     placeholder: "实验当前进展状态...", required: true },
  { key: "problems",     label: "遇到的问题",       placeholder: "遇到的问题或困难...", required: false },
  { key: "nextWeekPlan", label: "下周计划",         placeholder: "下周工作计划...", required: true },
  { key: "helpNeeded",   label: "需要导师帮助的事项", placeholder: "需要导师协助或建议的内容...", required: false },
];

interface Props {
  value: WeeklyReportContent;
  onChange: (updated: WeeklyReportContent) => void;
  disabled?: boolean;
}

export function ReportContentForm({ value, onChange, disabled = false }: Props) {
  const handleChange = (key: keyof WeeklyReportContent, text: string) => {
    onChange({ ...value, [key]: text });
  };

  return (
    <div className="flex flex-col gap-5">
      {FIELDS.map(({ key, label, placeholder, required }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <textarea
            rows={4}
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm leading-relaxed",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "resize-none transition-colors",
              disabled
                ? "bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
            ].join(" ")}
            placeholder={placeholder}
            value={value[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
