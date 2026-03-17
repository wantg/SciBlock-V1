/**
 * 跨标签页存储同步 Hook
 * 当 localStorage 数据在其他标签页被修改时，自动同步到当前页面
 */

import { useEffect, useCallback } from "react";

type StorageKey = `sciblock:${string}`;

interface UseStorageSyncOptions<T> {
  key: StorageKey;
  onChange: (newValue: T | null) => void;
  deserialize?: (value: string) => T;
}

export function useStorageSync<T>({
  key,
  onChange,
  deserialize = JSON.parse,
}: UseStorageSyncOptions<T>) {
  const handleStorageChange = useCallback(
    (e: StorageEvent) => {
      if (e.key !== key) return;
      
      try {
        const newValue = e.newValue ? deserialize(e.newValue) : null;
        onChange(newValue);
      } catch {
        // 解析失败，忽略
      }
    },
    [key, onChange, deserialize]
  );

  useEffect(() => {
    // 监听其他标签页的 storage 变化
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleStorageChange]);
}
