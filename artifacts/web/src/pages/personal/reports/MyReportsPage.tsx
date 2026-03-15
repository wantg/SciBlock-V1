import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReportListPanel } from "./ReportListPanel";
import { ReportWorkPanel } from "./ReportWorkPanel";
import { useMyReports, useCurrentStudentProfile, getCurrentWeekDefaults } from "@/hooks/reports/useMyReports";
import { useCurrentUser } from "@/contexts/UserContext";
import type { WeeklyReport } from "@/types/weeklyReport";
import { fmtDate } from "@/types/weeklyReport";

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
  const { currentUser } = useCurrentUser();
  const { profile, loading: profileLoading, error: profileError } = useCurrentStudentProfile();
  const { reports, loading: reportsLoading, create, save, submit, remove } = useMyReports(
    profile?.id ?? null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const userId = currentUser?.id ?? "";
  const studentId = profile?.id ?? "";
  const studentName = profile?.name ?? "我";
  const loading = profileLoading || reportsLoading;

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

  // Profile loading state
  if (profileLoading) {
    return (
      <AppLayout title="我的周报">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-400">加载中…</p>
        </div>
      </AppLayout>
    );
  }

  // No student profile bound to this account
  if (!profile) {
    return (
      <AppLayout title="我的周报">
        <div className="flex h-full items-center justify-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 w-96 text-center">
            <div className="w-10 h-10 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center mx-auto mb-4">
              <span className="text-yellow-600 text-lg">!</span>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">账号未绑定学生档案</h3>
            <p className="text-sm text-gray-500">
              {profileError
                ? "加载学生档案时出错，请刷新页面重试。"
                : "你的账号尚未与学生档案关联。请联系导师完成绑定后再访问此页面。"}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="我的周报">
      <div className="flex h-full -mx-8 -my-8">
        {showNewForm ? (
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
