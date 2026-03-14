/**
 * UserContext — 当前登录用户的全局状态
 *
 * Layer: context (singleton, wraps the entire authenticated app)
 *
 * 职责:
 *   - 登录后将 {id, email, name} 存入 localStorage，刷新后自动恢复
 *   - 提供 setCurrentUser / clearCurrentUser 给 useLogin hook 调用
 *   - 其他模块（如 messages API）可通过 getCurrentUserId() 直接读 localStorage，
 *     无需注入此 context（避免 prop-drilling）
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "../types/auth";

const STORAGE_KEY = "sciblock:currentUser";

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface UserContextValue {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  clearCurrentUser: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(
    () => readStoredUser(),
  );

  const setCurrentUser = useCallback((user: User) => {
    writeStoredUser(user);
    setCurrentUserState(user);
  }, []);

  const clearCurrentUser = useCallback(() => {
    writeStoredUser(null);
    setCurrentUserState(null);
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, clearCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useCurrentUser must be used inside UserProvider");
  return ctx;
}
