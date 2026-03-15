import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeamReportListPanel } from "./TeamReportListPanel";
import { TeamReportDetailPanel } from "./TeamReportDetailPanel";
import { useTeamReports } from "@/hooks/reports/useTeamReports";
import type { StudentWithReport } from "@/hooks/reports/useTeamReports";
import { fmtDate, fmtWeekLabel } from "@/types/weeklyReport";

export function TeamReportsPage() {
  const {
    weekStart,
    weekEnd,
    goToPrevWeek,
    goToNextWeek,
    students,
    loading,
    error,
    changeStatus,
  } = useTeamReports();

  const [selectedStudent, setSelectedStudent] = useState<StudentWithReport | null>(null);

  const handleSelectStudent = (s: StudentWithReport) => {
    setSelectedStudent(s);
  };

  // Sync selectedStudent when data reloads
  const syncedStudent = selectedStudent
    ? students.find((s) => s.id === selectedStudent.id) ?? selectedStudent
    : null;

  return (
    <AppLayout title="周报管理">
      <div className="flex flex-col h-full -mx-8 -my-8">
        {/* Week selector bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={goToPrevWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="上一周"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-semibold text-gray-700 min-w-[180px] text-center">
            {fmtWeekLabel(weekStart)}
          </div>
          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="下一周"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-xs text-gray-400 ml-1">
            {fmtDate(weekStart)} – {fmtDate(weekEnd)}
          </span>
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
            onChangeStatus={changeStatus}
          />
        </div>
      </div>
    </AppLayout>
  );
}
