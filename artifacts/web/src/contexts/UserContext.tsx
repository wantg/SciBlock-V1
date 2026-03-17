/**
 * UserContext — 当前登录用户的全局状态
 *
 * Layer: context (singleton, wraps the entire authenticated app)
 *
 * 职责:
 *   - 登录后将用户信息存入 localStorage，刷新后自动恢复
 *   - 提供 setCurrentUser / clearCurrentUser 给登录/登出流程调用
 *   - clearCurrentUser 同时清除 JWT token（通过 clearSession()）
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { User } from "../types/auth";
import { clearSession, getStoredToken } from "../api/client";
import { me } from "../api/auth";
import { useStorageSync } from "@/hooks/useStorageSync";

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
    // clearSession removes both sciblock:token and sciblock:currentUser.
    clearSession();
    setCurrentUserState(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Cross-tab synchronization: sync user state when other tabs modify localStorage
  // ---------------------------------------------------------------------------
  useStorageSync<User>({
    key: STORAGE_KEY as `sciblock:${string}`,
    onChange: (newUser) => {
      if (newUser) {
        // 其他标签页登录了新用户
        setCurrentUserState(newUser);
      } else {
        // 其他标签页登出了
        setCurrentUserState(null);
      }
    },
  });

  // ---------------------------------------------------------------------------
  // On mount: verify the stored token against the server and sync the user.
  //
  // localStorage is shared across all tabs on the same origin.  When the
  // tester logs in with a different account in another tab the user object in
  // localStorage is overwritten, so the role read by readStoredUser() on
  // refresh may belong to the other account.
  //
  // Calling GET /api/auth/me derives the user directly from the current JWT
  // token (the authoritative source of role/identity).  If the result differs
  // from what readStoredUser() returned we silently correct both the React
  // state and localStorage without touching any login flow.
  //
  // Failure modes:
  //   401 → apiFetch already clears the session and redirects to /login
  //         (no action needed here).
  //   Other error (network, 5xx) → keep the existing state; do nothing.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!getStoredToken()) return;
    me()
      .then((user) => {
        writeStoredUser(user);
        setCurrentUserState(user);
      })
      .catch(() => {
        // Handled upstream: 401 → redirect, others → keep state.
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
