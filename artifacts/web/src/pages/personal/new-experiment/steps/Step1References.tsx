import React, { useRef } from "react";
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { ImportedFile, FileStatus } from "@/types/experiment";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  FileStatus,
  { label: string; className: string; Icon?: React.ElementType }
> = {
  pending: {
    label: "待分析",
    className: "bg-gray-100 text-gray-500",
  },
  analyzing: {
    label: "分析中",
    className: "bg-amber-50 text-amber-600",
    Icon: Loader2,
  },
  done: {
    label: "已完成",
    className: "bg-green-50 text-green-600",
    Icon: CheckCircle2,
  },
};

function StatusBadge({ status }: { status: FileStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
        cfg.className,
      ].join(" ")}
    >
      {cfg.Icon && (
        <cfg.Icon
          size={11}
          className={status === "analyzing" ? "animate-spin" : ""}
        />
      )}
      {cfg.label}
    </span>
  );
}

// ─── Upload area ──────────────────────────────────────────────────────────────

interface UploadAreaProps {
  onFilesSelected: (files: FileList) => void;
}

function UploadArea({ onFilesSelected }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-center hover:border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer bg-gray-50"
      >
        <UploadCloud size={32} className="text-gray-300" />
        <div>
          <p className="text-sm font-medium text-gray-600">拖入文件或点击上传</p>
          <p className="text-xs text-gray-400 mt-0.5">支持 PDF、Word、TXT 等格式</p>
        </div>
      </div>
    </>
  );
}

// ─── File row ─────────────────────────────────────────────────────────────────

interface FileRowProps {
  file: ImportedFile;
  onRemove: () => void;
}

function FileRow({ file, onRemove }: FileRowProps) {
  const removable = file.status !== "analyzing";

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
        <FileText size={14} className="text-gray-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={10} className="text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-400">
            {file.fileType} · {file.size} · 导入于 {file.importedAt}
          </p>
        </div>
      </div>

      <StatusBadge status={file.status} />

      <button
        onClick={onRemove}
        disabled={!removable}
        aria-label="移除文件"
        className={[
          "p-1 rounded transition-colors flex-shrink-0",
          removable
            ? "text-gray-400 hover:text-gray-700 hover:bg-gray-200"
            : "text-gray-200 cursor-not-allowed",
        ].join(" ")}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Analysis complete banner ─────────────────────────────────────────────────

interface AnalysisCompleteBannerProps {
  onProceed: () => void;
}

function AnalysisCompleteBanner({ onProceed }: AnalysisCompleteBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Sparkles size={16} className="text-sky-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-sky-800">参考内容分析完成</p>
          <p className="text-xs text-sky-600 mt-0.5">
            左侧步骤 2–5 已就绪，可继续填写实验信息
          </p>
        </div>
      </div>
      <button
        onClick={onProceed}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors flex-shrink-0"
      >
        继续填写
        <ArrowRight size={13} />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  files: ImportedFile[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: string) => void;
  onAnalyze: () => void;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  analysisComplete: boolean;
  /** Called when the user proceeds to the next step after analysis */
  onProceed: () => void;
}

export function Step1References({
  files,
  onAddFiles,
  onRemoveFile,
  onAnalyze,
  canAnalyze,
  isAnalyzing,
  analysisComplete,
  onProceed,
}: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          sciNote 参考内容
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          上传实验相关参考资料，系统将自动提取关键信息
        </p>
      </div>

      {analysisComplete ? (
        <AnalysisCompleteBanner onProceed={onProceed} />
      ) : null}

      <UploadArea onFilesSelected={onAddFiles} />

      {files.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            已导入内容 ({files.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onRemove={() => onRemoveFile(file.id)}
              />
            ))}
          </div>
        </div>
      )}

      {!analysisComplete && (
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className={[
            "self-start flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors",
            canAnalyze
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          {isAnalyzing && <Loader2 size={14} className="animate-spin" />}
          开始分析
        </button>
      )}
    </div>
  );
}
