import { useState } from "react";
import type { ImportedFile, FileStatus } from "@/types/experiment";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function deriveFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toUpperCase();
  return ext ?? "FILE";
}

export interface UseReferencesResult {
  files: ImportedFile[];
  /** Add files selected from a native file picker */
  addFiles: (selected: FileList) => void;
  removeFile: (id: string) => void;
  /** Simulate analysis: pending → analyzing → done */
  analyze: () => void;
  /** True when pending files exist and nothing is currently analyzing */
  canAnalyze: boolean;
  /** True when at least one file is currently analyzing */
  isAnalyzing: boolean;
  /** True when at least one file exists and all are done */
  analysisComplete: boolean;
}

const ANALYZE_BASE_DELAY_MS = 1400;
const ANALYZE_STAGGER_MS = 700;

export function useReferences(initial: ImportedFile[]): UseReferencesResult {
  const [files, setFiles] = useState<ImportedFile[]>(initial);

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const analyzingCount = files.filter((f) => f.status === "analyzing").length;
  const canAnalyze = pendingCount > 0 && analyzingCount === 0;
  const isAnalyzing = analyzingCount > 0;
  const analysisComplete =
    files.length > 0 && files.every((f) => f.status === "done");

  function addFiles(selected: FileList) {
    const now = new Date();
    const incoming: ImportedFile[] = Array.from(selected).map((f) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      fileType: deriveFileType(f.name),
      size: formatSize(f.size),
      importedAt: formatTime(now),
      status: "pending" as FileStatus,
    }));
    setFiles((prev) => [...prev, ...incoming]);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function analyze() {
    // Capture current pending ids before any state update.
    const pendingIds = files
      .filter((f) => f.status === "pending")
      .map((f) => f.id);

    if (pendingIds.length === 0) return;

    // Immediately move all pending → analyzing.
    setFiles((prev) =>
      prev.map((f) =>
        pendingIds.includes(f.id) ? { ...f, status: "analyzing" } : f,
      ),
    );

    // Stagger each file's completion.
    pendingIds.forEach((id, index) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "done" } : f,
          ),
        );
      }, ANALYZE_BASE_DELAY_MS + index * ANALYZE_STAGGER_MS);
    });
  }

  return { files, addFiles, removeFile, analyze, canAnalyze, isAnalyzing, analysisComplete };
}
