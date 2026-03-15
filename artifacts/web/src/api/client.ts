const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------

const TOKEN_KEY = "sciblock:token";
const USER_KEY = "sciblock:currentUser";

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

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getStoredToken();
  const userId = (() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as { id?: string }).id ?? "" : "";
    } catch {
      return "";
    }
  })();

  const extraHeaders: Record<string, string> = {};
  if (token) extraHeaders["Authorization"] = `Bearer ${token}`;
  if (userId) extraHeaders["X-User-Id"] = userId;

  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.message ?? "Request failed",
      body.error,
    );
  }

  return res.json() as Promise<T>;
}
