const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");
const API_ORIGIN = API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8080" : "");
const API_ROOT = API_ORIGIN ? `${API_ORIGIN}/api` : `${BASE}/api`;

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const TOKEN_KEY = "sciblock:token";
const USER_KEY = "sciblock:currentUser";
// TRANSITION: removed once all student accounts have a confirmed user_id binding.
const STUDENT_ID_KEY = "sciblock:myStudentId";
const LOGIN_PATH = `${BASE}/login`;

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Session clearance
//
// Removes all authentication state from localStorage so that on the next
// page load the app starts in a fully unauthenticated state.
// Call this from logout flows AND from the 401 handler below.
// ---------------------------------------------------------------------------

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // TRANSITION: Remove the legacy manual student-picker key if present.
    // This key is no longer written after the useCurrentStudentProfile migration.
    localStorage.removeItem(STUDENT_ID_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

/**
 * Central HTTP client for all API calls.
 *
 * Identity is conveyed via `Authorization: Bearer <token>` only.
 * The backend (Go for scinotes/experiments, Express for messages/reports/team)
 * extracts the user ID from the JWT claims server-side.
 *
 * 401 handling: clears the session and redirects to the login page.
 * All other non-2xx responses throw ApiError which callers may handle.
 *
 * X-User-Id is no longer sent — it was a forgeable stopgap.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getStoredToken();

  const authHeaders: Record<string, string> = {};
  if (token) authHeaders["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_ROOT}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new ApiError(
      res.status,
      body.message ?? "Request failed",
      body.error,
    );

    // 401: token is absent, expired, or invalid.
    // Clear both auth keys and redirect to login — do this AFTER constructing
    // the error so callers that catch synchronously still get the ApiError,
    // then the navigation fires.
    if (res.status === 401 && !window.location.pathname.endsWith("/login")) {
      clearSession();
      window.location.assign(LOGIN_PATH);
    }

    throw err;
  }

  return res.json() as Promise<T>;
}
