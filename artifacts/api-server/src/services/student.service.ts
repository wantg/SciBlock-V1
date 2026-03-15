/**
 * StudentService — business logic for student identity resolution.
 *
 * Rule: no HTTP/Express imports; no direct DB queries.
 * Only calls repository functions and applies business rules.
 */

import {
  findStudentByUserId,
  type StudentRow,
} from "../repositories/student.repository";

export type { StudentRow };

/**
 * Resolves the student profile bound to the given user account.
 *
 * Returns the student profile, or null when the user has not yet been
 * linked to a student record (e.g. a student account with no profile,
 * or an instructor who has no student entry at all).
 *
 * Callers that need to enforce the binding (e.g. report access) should
 * treat a null return as a 409 Conflict — the account exists but the
 * binding is missing, which is distinct from "no reports found."
 */
export async function getStudentByUserId(userId: string): Promise<StudentRow | null> {
  return findStudentByUserId(userId);
}
