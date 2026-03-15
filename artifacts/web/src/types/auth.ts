export interface User {
  id: string;
  email: string;
  name: string;
  /** User role returned by the Go API (e.g. "student" | "instructor" | "admin"). */
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Shape returned by POST /api/auth/login (proxied to the Go API). */
export interface LoginResponse {
  token: string;
  user: User;
}
