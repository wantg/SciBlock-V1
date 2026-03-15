/**
 * StudentRepository — raw database access for the students table.
 *
 * Rule: no business logic here; no HTTP knowledge; only Drizzle queries.
 * Called exclusively from student.service.ts.
 */

import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export type StudentRow = typeof studentsTable.$inferSelect;

/**
 * Returns the student profile whose user_id matches the given userId,
 * or null when no binding exists.
 */
export async function findStudentByUserId(userId: string): Promise<StudentRow | null> {
  const [row] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Returns a student profile by its own primary key (students.id).
 * Returns null when not found.
 */
export async function findStudentById(id: string): Promise<StudentRow | null> {
  const [row] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, id))
    .limit(1);
  return row ?? null;
}
