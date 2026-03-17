/**
 * 乐观更新工具函数
 * 统一处理：乐观更新 → API 调用 → 成功确认/失败回滚
 */

import { toast } from "@/hooks/use-toast";

interface OptimisticUpdateOptions<T, R = T> {
  /** 乐观更新函数（立即执行） */
  optimistic: () => void;
  /** API 调用函数 */
  apiCall: () => Promise<R>;
  /** 失败时的回滚函数 */
  rollback: () => void;
  /** 成功时的回调（可选） */
  onSuccess?: (result: R) => void;
  /** 错误提示消息 */
  errorMessage: string;
  /** 成功提示消息（可选，默认不提示） */
  successMessage?: string;
}

/**
 * 执行带自动回滚的乐观更新
 */
export async function withRollback<T, R = T>({
  optimistic,
  apiCall,
  rollback,
  onSuccess,
  errorMessage,
  successMessage,
}: OptimisticUpdateOptions<T, R>): Promise<boolean> {
  optimistic();

  try {
    const result = await apiCall();
    
    if (successMessage) {
      toast({ title: "成功", description: successMessage });
    }
    
    onSuccess?.(result);
    return true;
  } catch (error) {
    // 必须回滚
    rollback();
    
    toast({
      title: "操作失败",
      description: errorMessage,
      variant: "destructive",
    });
    
    return false;
  }
}

/**
 * 防抖保存状态
 */
export interface DebouncedSaveState {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: number;
  error?: string;
}

/**
 * 防抖保存专用：带状态跟踪的保存
 */
export function createDebouncedSave(
  saveFn: (content: string) => Promise<void>,
  delay: number = 1500
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let state: DebouncedSaveState = { status: "idle" };

  return {
    getState: () => state,
    
    schedule: (content: string, onStateChange?: (state: DebouncedSaveState) => void) => {
      if (timer) clearTimeout(timer);
      
      state = { status: "saving" };
      onStateChange?.(state);

      timer = setTimeout(async () => {
        try {
          await saveFn(content);
          state = { status: "saved", lastSavedAt: Date.now() };
        } catch (error) {
          state = { 
            status: "error", 
            error: "保存失败，请检查网络" 
          };
        }
        onStateChange?.(state);
      }, delay);
    },
    
    cancel: () => {
      if (timer) clearTimeout(timer);
      state = { status: "idle" };
    },
  };
}
