import React from "react";
import { UploadCloud, PenLine } from "lucide-react";

interface Props {
  onChooseUpload: () => void;
  onSkip: () => void;
}

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  primary?: boolean;
  onClick: () => void;
}

function OptionCard({
  icon,
  title,
  description,
  actionLabel,
  primary = false,
  onClick,
}: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "group flex flex-col items-start gap-4 rounded-2xl border-2 p-6 text-left transition-all",
        primary
          ? "border-gray-900 bg-white hover:bg-gray-900 hover:text-white"
          : "border-gray-200 bg-white hover:border-gray-400",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
          primary
            ? "bg-gray-100 text-gray-900 group-hover:bg-white/20 group-hover:text-white"
            : "bg-gray-100 text-gray-600 group-hover:bg-gray-200",
        ].join(" ")}
      >
        {icon}
      </span>

      <div>
        <p
          className={[
            "text-base font-semibold transition-colors",
            primary ? "text-gray-900 group-hover:text-white" : "text-gray-800",
          ].join(" ")}
        >
          {title}
        </p>
        <p
          className={[
            "mt-1 text-sm leading-relaxed transition-colors",
            primary ? "text-gray-500 group-hover:text-white/70" : "text-gray-500",
          ].join(" ")}
        >
          {description}
        </p>
      </div>

      <span
        className={[
          "mt-auto text-sm font-medium transition-colors",
          primary
            ? "text-gray-900 group-hover:text-white"
            : "text-gray-600 group-hover:text-gray-900",
        ].join(" ")}
      >
        {actionLabel} →
      </span>
    </button>
  );
}

export function Step1Choice({ onChooseUpload, onSkip }: Props) {
  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          创建你的实验基础信息
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          选择一种方式开始初始化你的实验记录
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <OptionCard
          primary
          icon={<UploadCloud size={20} />}
          title="上传内容"
          description="上传参考文件，AI 将自动提取实验关键信息并填充后续步骤"
          actionLabel="上传参考资料"
          onClick={onChooseUpload}
        />
        <OptionCard
          icon={<PenLine size={20} />}
          title="跳过，手动填写"
          description="跳过上传步骤，直接进入手动填写流程，逐步完善实验信息"
          actionLabel="进入手动填写"
          onClick={onSkip}
        />
      </div>
    </div>
  );
}
