import { useState, useEffect, useCallback } from "react";
import {
  fetchMyReports,
  createReport,
  updateReport,
  deleteReport,
} from "@/api/weeklyReport";
import type {
  WeeklyReport,
  WeeklyReportStatus,
  WeeklyReportContent,
  CreateWeeklyReportPayload,
} from "@/types/weeklyReport";
import { getWeekMonday, getWeekSunday } from "@/types/weeklyReport";

const LS_STUDENT_KEY = "sciblock:myStudentId";

export function useMyStudentId() {
  const [studentId, setStudentIdState] = useState<string | null>(
    () => localStorage.getItem(LS_STUDENT_KEY),
  );
  const setStudentId = useCallback((id: string) => {
    localStorage.setItem(LS_STUDENT_KEY, id);
    setStudentIdState(id);
  }, []);
  const clearStudentId = useCallback(() => {
    localStorage.removeItem(LS_STUDENT_KEY);
    setStudentIdState(null);
  }, []);
  return { studentId, setStudentId, clearStudentId };
}

interface UseMyReportsReturn {
  reports: WeeklyReport[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  create: (title: string, weekStart: string, weekEnd: string) => Promise<WeeklyReport>;
  save: (id: string, content: WeeklyReportContent, title?: string) => Promise<WeeklyReport>;
  submit: (id: string, content: WeeklyReportContent, title?: string) => Promise<WeeklyReport>;
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
      const data = await fetchMyReports(studentId);
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

  const create = useCallback(
    async (title: string, weekStart: string, weekEnd: string) => {
      if (!studentId) throw new Error("No student selected");
      const payload: CreateWeeklyReportPayload = {
        studentId,
        title,
        weekStart,
        weekEnd,
        status: "draft",
      };
      const report = await createReport(payload);
      setReports((prev) => [report, ...prev]);
      return report;
    },
    [studentId],
  );

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
    async (id: string, content: WeeklyReportContent, title?: string) => {
      const updated = await updateReport(id, {
        contentJson: JSON.stringify(content),
        status: "submitted",
        ...(title !== undefined ? { title } : {}),
      });
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await deleteReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reports, loading, error, reload: load, create, save, submit, remove };
}

export function getCurrentWeekDefaults() {
  const today = new Date();
  return {
    weekStart: getWeekMonday(today),
    weekEnd: getWeekSunday(today),
  };
}
