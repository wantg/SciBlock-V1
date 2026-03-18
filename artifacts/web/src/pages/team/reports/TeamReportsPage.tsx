import React, { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeamReportListPanel } from "./TeamReportListPanel";
import { TeamReportDetailPanel } from "./TeamReportDetailPanel";
import { useTeamReports } from "@/hooks/reports/useTeamReports";
import type { StudentWithReport } from "@/hooks/reports/useTeamReports";
import { fmtDate, fmtWeekLabel, getWeekMonday } from "@/types/weeklyReport";

export function TeamReportsPage() {
  const {
    weekStart,
    weekEnd,
    goToPrevWeek,
    goToNextWeek,
    setWeekStart,
    students,
    loading,
    error,
    reviewReport,
  } = useTeamReports();

  const [selectedStudent, setSelectedStudent] = useState<StudentWithReport | null>(null);

  const handleSelectStudent = (s: StudentWithReport) => {
    setSelectedStudent(s);
  };

  // Sync selectedStudent when data reloads
  const syncedStudent = selectedStudent
    ? students.find((s) => s.id === selectedStudent.id) ?? selectedStudent
    : null;

  const thisWeek = getWeekMonday(new Date());
  const isCurrentWeek = weekStart === thisWeek;

  return (
    <AppLayout title="周报管理">
      <div className="flex flex-col h-full -mx-8 -my-8">
        {/* Week selector bar — always visible; make current week obvious */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <CalendarDays size={15} className="text-gray-400 flex-shrink-0" />

          <button
            onClick={goToPrevWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="上一周"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Week label — primary label */}
          <div className="flex flex-col items-center min-w-[160px]">
            <span className="text-sm font-semibold text-gray-800">
              {fmtWeekLabel(weekStart)}
            </span>
            <span className="text-xs text-gray-400">
              {fmtDate(weekStart)} – {fmtDate(weekEnd)}
            </span>
          </div>

          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="下一周"
          >
            <ChevronRight size={16} />
          </button>

          {/* "Back to current week" — only shown when not viewing the current week */}
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekStart(thisWeek)}
              className="ml-2 px-2.5 py-1 text-xs rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors font-medium"
            >
              回到本周
            </button>
          )}

          {isCurrentWeek && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-md bg-green-50 text-green-600 border border-green-200 font-medium">
              本周
            </span>
          )}
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Body: two panels */}
        <div className="flex flex-1 min-h-0">
          <TeamReportListPanel
            students={students}
            selectedStudentId={syncedStudent?.id ?? null}
            onSelect={handleSelectStudent}
            loading={loading}
          />
          <TeamReportDetailPanel
            selected={syncedStudent}
            weekStart={weekStart}
            weekEnd={weekEnd}
            onReview={reviewReport}
          />
        </div>
      </div>
    </AppLayout>
  );
}
