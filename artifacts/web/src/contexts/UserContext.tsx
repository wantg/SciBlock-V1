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

const STORAGE_KEY = "sciblock:currentUser";
const TOKEN_STORAGE_KEY = "sciblock:token";

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

  // ---------------------------------------------------------------------------
  // Cross-iframe / cross-tab session sync.
  //
  // The `storage` event fires in every same-origin context *other than* the
  // one that wrote the change.  This is exactly what we need: when the user
  // logs in or out in another iframe/tab, every other frame detects the new
  // token and re-syncs its React state so that:
  //   - UI role   matches the new JWT role
  //   - API calls carry the correct token
  //
  // We watch both TOKEN_STORAGE_KEY and STORAGE_KEY so that either change
  // triggers a resync.
  //
  // Sync rules:
  //   - Token removed → treat as logged out; clear React state immediately.
  //   - Token present → call /api/auth/me to re-derive user from JWT.
  //     This is the authoritative source; we do not trust the raw localStorage
  //     user object in case it is stale.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleStorage(event: StorageEvent): void {
      if (event.key !== TOKEN_STORAGE_KEY && event.key !== STORAGE_KEY) return;

      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!currentToken) {
        setCurrentUserState(null);
        return;
      }

      me()
        .then((user) => {
          writeStoredUser(user);
          setCurrentUserState(user);
        })
        .catch(() => {
          // 401 → apiFetch clears session + redirects; nothing more needed.
          // Other transient errors → leave current state intact.
        });
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
