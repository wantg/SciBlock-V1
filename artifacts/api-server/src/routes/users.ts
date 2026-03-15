/**
 * Users routes — authenticated user self-inspection.
 *
 * GET /users/me            — returns basic identity from JWT claims
 * GET /users/me/student    — returns the student profile bound to this account
 *
 * All routes are protected by requireAuth (applied in routes/index.ts).
 * Identity is read exclusively from res.locals (injected by requireAuth).
 * No X-User-Id header is accepted.
 */

import { Router } from "express";
import { getStudentByUserId } from "../services/student.service";

const router = Router();

// ---------------------------------------------------------------------------
// GET /users/me
// Returns the caller's basic identity derived from the JWT.
// ---------------------------------------------------------------------------
router.get("/me", (req, res) => {
  res.json({
    id:    res.locals.userId,
    email: res.locals.email,
    name:  res.locals.name,
    role:  res.locals.role,
  });
});

// ---------------------------------------------------------------------------
// GET /users/me/student
//
// Returns the student profile whose user_id is bound to this user account.
//
// 200 — profile found; body is the student row.
// 404 — this user account has no student profile binding.
//       Semantically distinct from "student has no reports" — the account
//       configuration is incomplete, not the data set.
// ---------------------------------------------------------------------------
router.get("/me/student", async (req, res) => {
  try {
    const student = await getStudentByUserId(res.locals.userId);
    if (!student) {
      res.status(404).json({
        error: "not_found",
        message: "No student profile is bound to this account",
      });
      return;
    }
    res.json(student);
  } catch (err) {
    console.error("[users] GET /me/student error:", err);
    res.status(500).json({ message: "Failed to resolve student profile" });
  }
});

export default router;
