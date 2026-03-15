/**
 * users API — authenticated user self-inspection.
 *
 * fetchMyStudentProfile:
 *   Calls GET /api/users/me/student.
 *   Returns the student profile bound to the caller's account, or null if
 *   no binding exists (server returns 404).
 *   Callers should treat null as "account not yet linked to a student profile"
 *   and surface an appropriate message — not silently render an empty list.
 */

import { apiFetch, ApiError } from "./client";

export interface StudentProfile {
  id: string;
  name: string;
  avatar: string | null;
  enrollmentYear: number;
  degree: string;
  researchTopic: string;
  phone: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  userId: string | null;
}

export async function fetchMyStudentProfile(): Promise<StudentProfile | null> {
  try {
    return await apiFetch<StudentProfile>("/users/me/student");
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
