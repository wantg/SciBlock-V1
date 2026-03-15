import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReportListPanel } from "./ReportListPanel";
import { ReportWorkPanel } from "./ReportWorkPanel";
import { useMyReports, useMyStudentId, getCurrentWeekDefaults } from "@/hooks/reports/useMyReports";
import type { WeeklyReport } from "@/types/weeklyReport";
import { fmtDate } from "@/types/weeklyReport";

// ---------------------------------------------------------------------------
// Student selector (shown when no student is chosen)
// ---------------------------------------------------------------------------
interface StudentPickerProps {
  onSelect: (id: string) => void;
}

function StudentPicker({ onSelect }: StudentPickerProps) {
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL.replace(/\/$/, "") + "/api/reports/team")
      .then((r) => r.json())
      .then((data) => setStudents(data.students ?? []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">加载中…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-80 text-center">
        <h3 className="text-base font-semibold text-gray-800 mb-1">选择你的学生档案</h3>
        <p className="text-sm text-gray-500 mb-5">选择后将记住你的身份</p>
        <div className="flex flex-col gap-2">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
            >
              {s.name}
            </button>
          ))}
          {students.length === 0 && (
            <p className="text-sm text-gray-400">暂无学生档案</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New report dialog (inline)
// ---------------------------------------------------------------------------
interface NewReportDialogProps {
  onConfirm: (title: string, weekStart: string, weekEnd: string) => void;
  onCancel: () => void;
}

function NewReportForm({ onConfirm, onCancel }: NewReportDialogProps) {
  const { weekStart, weekEnd } = getCurrentWeekDefaults();
  const [title, setTitle] = useState(`周报 ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`);
  const [ws, setWs] = useState(weekStart);
  const [we, setWe] = useState(weekEnd);

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-96">
        <h3 className="text-base font-semibold text-gray-800 mb-4">新建周报</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={ws}
                onChange={(e) => setWs(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={we}
                onChange={(e) => setWe(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => onConfirm(title.trim() || "新周报", ws, we)}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              创建草稿
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function MyReportsPage() {
  const { studentId, setStudentId } = useMyStudentId();
  const { reports, loading, create, save, submit, remove } = useMyReports(studentId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [studentName, setStudentName] = useState("我");

  const userId = (() => {
    try { return JSON.parse(localStorage.getItem("sciblock:currentUser") ?? "{}").id ?? ""; } catch { return ""; }
  })();

  // Fetch student name
  useEffect(() => {
    if (!studentId) return;
    fetch(import.meta.env.BASE_URL.replace(/\/$/, "") + `/api/team/members/${studentId}`)
      .then((r) => r.json())
      .then((d) => setStudentName(d.name ?? "我"))
      .catch(() => {});
  }, [studentId]);

  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  const handleNew = () => {
    setShowNewForm(true);
  };

  const handleNewConfirm = async (title: string, weekStart: string, weekEnd: string) => {
    const report = await create(title, weekStart, weekEnd);
    setSelectedId(report.id);
    setShowNewForm(false);
  };

  const handleReportUpdated = (updated: WeeklyReport) => {
    setSelectedId(updated.id);
  };

  return (
    <AppLayout title="我的周报">
      <div className="flex h-full -mx-8 -my-8">
        {!studentId ? (
          <StudentPicker onSelect={setStudentId} />
        ) : showNewForm ? (
          <NewReportForm
            onConfirm={handleNewConfirm}
            onCancel={() => setShowNewForm(false)}
          />
        ) : (
          <>
            {/* Left: list */}
            <ReportListPanel
              reports={reports}
              selectedId={selectedId}
              onSelect={(r) => { setSelectedId(r.id); setShowNewForm(false); }}
              onNew={handleNew}
              loading={loading}
            />

            {/* Right: work area */}
            <ReportWorkPanel
              report={selectedReport}
              studentId={studentId}
              studentName={studentName}
              userId={userId}
              onSave={save}
              onSubmit={submit}
              onDelete={async (id) => { await remove(id); setSelectedId(null); }}
              onReportUpdated={handleReportUpdated}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
