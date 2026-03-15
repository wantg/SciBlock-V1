import type { LoginRequest, LoginResponse, User } from "@/types/auth";
import { apiFetch } from "./client";

/** POST /api/auth/login — returns a JWT token and the authenticated user. */
export function login(data: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * GET /api/auth/me — returns the currently authenticated user.
 * Requires a valid JWT Bearer token in localStorage (set by login).
 */
export function me(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

/** POST /api/auth/logout — tells the server to invalidate the session (no-op with stateless JWTs, but good practice). */
export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}
