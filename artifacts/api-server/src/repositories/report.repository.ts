/**
 * ReportRepository — raw database access for weekly_reports.
 *
 * Rule: no business logic; no HTTP/Express imports; only Drizzle queries.
 * Called exclusively from report.service.ts and routes/reports.ts.
 */

import { db } from "@workspace/db";
import { weeklyReportsTable } from "@workspace/db/schema";
import { eq, ne, and, desc } from "drizzle-orm";

export type ReportRow = typeof weeklyReportsTable.$inferSelect;

export async function findReportById(id: string): Promise<ReportRow | null> {
  const [row] = await db
    .select()
    .from(weeklyReportsTable)
    .where(eq(weeklyReportsTable.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Marks a report as submitted: sets status='submitted' and writes submittedAt.
 * Returns the updated row, or null if the ID no longer exists.
 */
export async function markReportSubmitted(id: string): Promise<ReportRow | null> {
  const [row] = await db
    .update(weeklyReportsTable)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(weeklyReportsTable.id, id))
    .returning();
  return row ?? null;
}

/**
 * Returns non-draft reports for the instructor team view, optionally
 * filtered to a specific week.
 *
 * Draft reports are excluded — instructors must not see content that
 * students have not chosen to share.
 */
export async function findSubmittedReportsForTeam(weekStart?: string): Promise<ReportRow[]> {
  if (weekStart) {
    return db
      .select()
      .from(weeklyReportsTable)
      .where(
        and(
          eq(weeklyReportsTable.weekStart, weekStart),
          ne(weeklyReportsTable.status, "draft"),
        ),
      )
      .orderBy(desc(weeklyReportsTable.updatedAt));
  }
  return db
    .select()
    .from(weeklyReportsTable)
    .where(ne(weeklyReportsTable.status, "draft"))
    .orderBy(desc(weeklyReportsTable.weekStart));
}
