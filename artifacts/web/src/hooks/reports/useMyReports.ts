import { useState, useEffect, useCallback } from "react";
import {
  fetchMyReports,
  updateReport,
  submitReport as apiSubmitReport,
  deleteReport,
} from "@/api/weeklyReport";
import { fetchMyStudentProfile, type StudentProfile } from "@/api/users";
import type {
  WeeklyReport,
  WeeklyReportContent,
} from "@/types/weeklyReport";

// ---------------------------------------------------------------------------
// useCurrentStudentProfile
//
// Resolves the student profile bound to the current user account by calling
// GET /api/users/me/student.  Returns null when no binding exists — callers
// must surface a meaningful error in that case (not render an empty list).
// ---------------------------------------------------------------------------

interface UseStudentProfileReturn {
  profile: StudentProfile | null;
  loading: boolean;
  error: string | null;
}

export function useCurrentStudentProfile(): UseStudentProfileReturn {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchMyStudentProfile()
      .then((p) => { setProfile(p); setError(null); })
      .catch(() => setError("无法加载学生档案"))
      .finally(() => setLoading(false));
  }, []);

  return { profile, loading, error };
}

// ---------------------------------------------------------------------------
// useMyReports
//
// Manages CRUD for the current student's weekly reports.
// studentId is the students.id value (not the user's id) — pass profile?.id
// from useCurrentStudentProfile.
// ---------------------------------------------------------------------------

interface UseMyReportsReturn {
  reports: WeeklyReport[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  save: (id: string, content: WeeklyReportContent, title?: string) => Promise<WeeklyReport>;
  /**
   * Submits a report.
   *
   * When `content` is provided (manual reports), the draft is saved first
   * so the student's latest edits are preserved before the status changes.
   *
   * When `content` is omitted (AI-generated reports), the report is submitted
   * directly via the dedicated submit endpoint — the content already exists in DB.
   */
  submit: (id: string, content?: WeeklyReportContent, title?: string) => Promise<WeeklyReport>;
  remove: (id: string) => Promise<void>;
}

export function useMyReports(studentId: string | null): UseMyReportsReturn {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyReports();
      setReports(data);
    } catch {
      setError("加载周报失败");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (id: string, content: WeeklyReportContent, title?: string) => {
      const updated = await updateReport(id, {
        contentJson: JSON.stringify(content),
        status: "draft",
        ...(title !== undefined ? { title } : {}),
      });
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    [],
  );

  const submit = useCallback(
    async (id: string, content?: WeeklyReportContent, title?: string) => {
      // If the caller provides content (manual reports), persist the latest
      // edits as a draft first so they are not lost on the submit call.
      if (content !== undefined) {
        await updateReport(id, {
          contentJson: JSON.stringify(content),
          ...(title !== undefined ? { title } : {}),
        });
      }
      // Always use the dedicated submit endpoint — it validates ownership,
      // content presence, and writes submittedAt atomically.
      const updated = await apiSubmitReport(id);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await deleteReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reports, loading, error, reload: load, save, submit, remove };
}
