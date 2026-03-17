import { Check, Loader2, AlertCircle } from "lucide-react";

interface SaveStatusIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
  className?: string;
}

/**
 * 保存状态指示器
 * 显示编辑器内容的保存状态
 * 
 * 使用示例:
 * ```tsx
 * const { editorSaveState } = useWorkbench();
 * 
 * <SaveStatusIndicator 
 *   status={editorSaveState.status} 
 *   error={editorSaveState.error}
 * />
 * ```
 */
export function SaveStatusIndicator({ 
  status, 
  error,
  className = "",
}: SaveStatusIndicatorProps) {
  if (status === "idle") return null;
  
  if (status === "saving") {
    return (
      <span className={`flex items-center gap-1 text-xs text-gray-400 ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        保存中...
      </span>
    );
  }
  
  if (status === "saved") {
    return (
      <span className={`flex items-center gap-1 text-xs text-green-500 ${className}`}>
        <Check className="w-3 h-3" />
        已保存
      </span>
    );
  }
  
  return (
    <span 
      className={`flex items-center gap-1 text-xs text-red-500 ${className}`} 
      title={error}
    >
      <AlertCircle className="w-3 h-3" />
      保存失败
    </span>
  );
}
