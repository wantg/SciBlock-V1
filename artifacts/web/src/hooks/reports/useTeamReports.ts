import { useState, useEffect, useCallback } from "react";
import { fetchTeamReports, reviewReport as apiReviewReport } from "@/api/weeklyReport";
import type { TeamReportsResponse } from "@/api/weeklyReport";
import type { WeeklyReport, ReviewAction } from "@/types/weeklyReport";
import { getWeekMonday, getWeekSunday } from "@/types/weeklyReport";

export interface StudentWithReport {
  id: string;
  name: string;
  status: string;
  degree: string;
  researchTopic: string;
  avatar: string | null;
  /** Submitted report for the currently selected week, null if none. */
  report: WeeklyReport | null;
  /**
   * The student's most recently submitted report across all weeks.
   * Used to show instructors "last submitted on week X" when no report
   * exists for the currently selected week.
   */
  lastSubmission: WeeklyReport | null;
}

interface UseTeamReportsReturn {
  weekStart: string;
  weekEnd: string;
  setWeekStart: (w: string) => void;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  students: StudentWithReport[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  /**
   * Records an instructor review decision for the given report.
   * Calls POST /reports/:id/review (status update + optional comment + student notification).
   * Updates local state optimistically after the server confirms.
   */
  reviewReport: (
    reportId: string,
    action: ReviewAction,
    reviewerName: string,
    feedbackText?: string,
  ) => Promise<void>;
}

export function useTeamReports(): UseTeamReportsReturn {
  const [weekStart, setWeekStartState] = useState<string>(() =>
    getWeekMonday(new Date()),
  );
  const [data, setData] = useState<TeamReportsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = getWeekSunday(new Date(weekStart + "T00:00:00"));

  const load = useCallback(async (ws: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTeamReports(ws);
      setData(result);
    } catch {
      setError("加载周报失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

  const setWeekStart = useCallback((w: string) => {
    setWeekStartState(w);
  }, []);

  const goToPrevWeek = useCallback(() => {
    setWeekStartState((prev) => {
      const d = new Date(prev + "T00:00:00");
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStartState((prev) => {
      const d = new Date(prev + "T00:00:00");
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const students: StudentWithReport[] = (data?.students ?? []).map((s) => {
    const report =
      data?.reports.find(
        (r) => r.studentId === s.id && r.weekStart === weekStart,
      ) ?? null;
    const lastSubmission =
      data?.lastSubmissions?.find((r) => r.studentId === s.id) ?? null;
    return { ...s, report, lastSubmission };
  });

  const reviewReport = useCallback(
    async (
      reportId: string,
      action: ReviewAction,
      reviewerName: string,
      feedbackText?: string,
    ) => {
      const updated = await apiReviewReport(reportId, { action, reviewerName, feedbackText });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reports: prev.reports.map((r) => (r.id === reportId ? updated : r)),
        };
      });
    },
    [],
  );

  return {
    weekStart,
    weekEnd,
    setWeekStart,
    goToPrevWeek,
    goToNextWeek,
    students,
    loading,
    error,
    reload: () => load(weekStart),
    reviewReport,
  };
}
