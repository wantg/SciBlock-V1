import React, { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReportListPanel } from "./ReportListPanel";
import { ReportWorkPanel } from "./ReportWorkPanel";
import { GenerateReportWizard } from "./wizard/GenerateReportWizard";
import { AiReportDetailPanel } from "./detail/AiReportDetailPanel";
import { useMyReports, useCurrentStudentProfile } from "@/hooks/reports/useMyReports";
import { useCurrentUser } from "@/contexts/UserContext";
import type { WeeklyReport } from "@/types/weeklyReport";
import { isAiGenerated } from "@/types/weeklyReport";

// ---------------------------------------------------------------------------
// Right panel mode
//
// "empty"     — no report selected (shows placeholder)
// "wizard"    — 3-step auto-summary wizard (creates + generates a new report)
// "work"      — manual/historical report editor / viewer (ReportWorkPanel)
// "ai-detail" — structured view for an AI-generated report (AiReportDetailPanel)
// ---------------------------------------------------------------------------
type RightMode = "empty" | "wizard" | "work" | "ai-detail";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function MyReportsPage() {
  const { currentUser } = useCurrentUser();
  const { profile, loading: profileLoading, error: profileError } = useCurrentStudentProfile();
  const { reports, loading: reportsLoading, reload, save, submit, remove } = useMyReports(
    profile?.id ?? null,
  );
  const search = useSearch();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightMode, setRightMode] = useState<RightMode>("empty");

  const userId = currentUser?.id ?? "";
  const studentId = profile?.id ?? "";
  const studentName = profile?.name ?? "我";
  const loading = profileLoading || reportsLoading;

  // Auto-select when ?reportId=xxx is in URL (e.g. from message notification)
  useEffect(() => {
    const params = new URLSearchParams(search ?? "");
    const reportId = params.get("reportId");
    if (reportId) {
      setSelectedId(reportId);
      // Mode will be resolved by the effect below once reports are loaded
    }
  }, [search]);

  // Derive right panel mode from selected report whenever selection or its
  // generationStatus changes (e.g. after poll completes or on initial load)
  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (rightMode === "wizard") return; // wizard manages itself
    if (!selectedReport) {
      setRightMode("empty");
    } else if (isAiGenerated(selectedReport)) {
      setRightMode("ai-detail");
    } else {
      setRightMode("work");
    }
  }, [selectedReport?.id, selectedReport?.generationStatus]);

  const handleSelect = (r: WeeklyReport) => {
    setSelectedId(r.id);
    setRightMode(isAiGenerated(r) ? "ai-detail" : "work");
  };

  const handleAiGenerate = () => {
    setSelectedId(null);
    setRightMode("wizard");
  };

  const handleWizardComplete = async (report: WeeklyReport) => {
    await reload();
    setSelectedId(report.id);
    setRightMode("ai-detail");
  };

  const handleWizardCancel = () => {
    setRightMode(
      selectedReport
        ? isAiGenerated(selectedReport) ? "ai-detail" : "work"
        : "empty"
    );
  };

  const handleReportUpdated = (updated: WeeklyReport) => {
    setSelectedId(updated.id);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    setSelectedId(null);
    setRightMode("empty");
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
        {/* Left: report list */}
        <ReportListPanel
          reports={reports}
          selectedId={selectedId}
          onSelect={handleSelect}
          onAiGenerate={handleAiGenerate}
          loading={loading}
        />

        {/* Right: mode-based panel */}
        {rightMode === "wizard" && (
          <GenerateReportWizard
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
          />
        )}

        {(rightMode === "work" || rightMode === "empty") && (
          <ReportWorkPanel
            report={rightMode === "work" ? selectedReport : null}
            studentId={studentId}
            studentName={studentName}
            userId={userId}
            onSave={save}
            onSubmit={submit}
            onDelete={handleDelete}
            onReportUpdated={handleReportUpdated}
          />
        )}

        {rightMode === "ai-detail" && selectedReport && (
          <AiReportDetailPanel
            report={selectedReport}
            userId={userId}
            studentName={studentName}
            onDelete={handleDelete}
            onSubmit={submit}
          />
        )}
      </div>
    </AppLayout>
  );
}
