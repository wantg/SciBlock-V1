/**
 * requireAuth — Express middleware for JWT bearer token validation.
 *
 * Validates the `Authorization: Bearer <token>` header using the same
 * JWT_SECRET and algorithm (HS256) as the Go API. On success, injects
 * the parsed claims into res.locals so downstream handlers can read
 * the caller's identity without touching HTTP headers or storage.
 *
 * Scope: identity existence only.
 * This middleware does NOT implement role-based access control. Fine-grained
 * permission checks belong in individual service or handler layers when needed.
 *
 * Usage:
 *   router.use("/protected", requireAuth, protectedRouter);
 */

import { jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Type augmentation — extends Express.Locals for type safety across handlers.
// Declared here so all consumers get autocomplete without extra imports.
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Locals {
      /** UUID of the authenticated user, extracted from JWT `uid` claim. */
      userId: string;
      /** User role from JWT `role` claim. */
      role: string;
      /** User email from JWT `email` claim. */
      email: string;
      /** Display name from JWT `name` claim. */
      name: string;
    }
  }
}

// ---------------------------------------------------------------------------
// JWT claim shape — must match the Go token.Claims struct in pkg/token/jwt.go
// ---------------------------------------------------------------------------

interface JwtPayload {
  /** User UUID — maps to Claims.UserID / `uid` in Go. */
  uid: string;
  email: string;
  name: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Verifies the Bearer JWT and populates res.locals with caller identity.
 * Returns 401 if the header is absent, malformed, or the token is invalid.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Authentication required" });
    return;
  }

  const tokenStr = authHeader.slice("Bearer ".length);
  const rawSecret = process.env["JWT_SECRET"];

  if (!rawSecret) {
    // Misconfigured server — fail closed, not open.
    console.error("[requireAuth] JWT_SECRET environment variable is not set");
    res.status(500).json({ error: "server_error", message: "Authentication is misconfigured" });
    return;
  }

  const secret = new TextEncoder().encode(rawSecret);

  try {
    const { payload } = await jwtVerify<JwtPayload>(tokenStr, secret, {
      algorithms: ["HS256"],
    });

    res.locals.userId = payload.uid;
    res.locals.role   = payload.role  ?? "";
    res.locals.email  = payload.email ?? "";
    res.locals.name   = payload.name  ?? "";

    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
  }
}
