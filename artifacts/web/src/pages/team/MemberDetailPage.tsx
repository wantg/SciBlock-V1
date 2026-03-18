/**
 * MemberDetailPage — 学生详情页（/home/members/:id）
 *
 * Layer: page (orchestrator only — no layout logic, no permission checks,
 *         no section headings; all delegated to dedicated components).
 *
 * 职责：
 *  1. 数据获取：useStudentDetail, useMemberSciNotes
 *  2. 权限派生：isInstructor, isOwnProfile, canEdit
 *  3. 面板状态：useMemberDetailPanelState（选中互斥由 hook 保证）
 *  4. 汇总计数：paperCount, reportCount（ProfileCard 需要）
 *  5. 将以上数据装配到 MemberDetailLayout + 各 section 组件
 *
 * 不做的事（职责已转移）：
 *  - 布局切换（单栏/双栏）→ MemberDetailLayout
 *  - 实验记录 section 的权限检查 + 标题 → ExperimentRecordsSection
 *  - 周报 section 的权限检查 + 标题 → WeeklyReportsSection
 *  - 面板状态互斥逻辑 → useMemberDetailPanelState
 *  - 锁定提示 UI → SectionLockedNotice
 */

import { useState }                        from "react";
import { useLocation, useParams }          from "wouter";
import { BookOpen, FileText, GraduationCap, ChevronLeft } from "lucide-react";
import { useStudentDetail }                from "@/hooks/team/useStudentDetail";
import { useMemberSciNotes }               from "@/hooks/team/useMemberSciNotes";
import { useMemberDetailPanelState }       from "@/hooks/team/useMemberDetailPanelState";
import { useCurrentUser }                  from "@/contexts/UserContext";
import { MemberDetailLayout }              from "./detail/MemberDetailLayout";
import { ProfileCard }                     from "./detail/ProfileCard";
import { SectionHeading }                  from "@/components/team/SectionHeading";
import BasicInfoCard                       from "./detail/BasicInfoCard";
import PapersCard                          from "./detail/PapersCard";
import { ExperimentRecordsSection }        from "./detail/ExperimentRecordsSection";
import { WeeklyReportsSection }            from "./detail/WeeklyReportsSection";
import { MemberSciNoteExperimentsPanel }   from "./detail/MemberSciNoteExperimentsPanel";
import { MemberReportDetailPanel }         from "./detail/MemberReportDetailPanel";

export default function MemberDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { currentUser } = useCurrentUser();
  const isInstructor  = currentUser?.role === "instructor";

  const { student, loading, error, setStudent } = useStudentDetail(id ?? "");

  // canEdit: instructor can edit any profile; a student can only edit their own.
  const isOwnProfile = !!student?.userId && student.userId === currentUser?.id;
  const canEdit      = isInstructor || isOwnProfile;

  // Notes are kept at page level: both ExperimentRecordsSection and ProfileCard need them.
  const memberUserId = student?.userId ?? null;
  const { notes, loading: notesLoading, error: notesError } = useMemberSciNotes(
    isInstructor ? memberUserId : null,
  );

  // Counts for ProfileCard summary row
  const [paperCount,  setPaperCount]  = useState(0);
  const [reportCount, setReportCount] = useState(0);

  // Panel state — mutual exclusion enforced by the hook
  const {
    selectedSciNote,
    selectedReport,
    isDrilling,
    handleSelectSciNote,
    handleSelectReport,
  } = useMemberDetailPanelState();

  // ── Loading / error states ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
          <span className="text-xs text-gray-400">加载中…</span>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
        <GraduationCap size={32} className="text-gray-200" />
        <p className="text-sm">{error ?? "找不到该成员"}</p>
        <button
          onClick={() => navigate("/home/members")}
          className="text-xs text-black font-medium underline underline-offset-2"
        >
          返回成员列表
        </button>
      </div>
    );
  }

  // ── Right panel — determined by which selection is active ───────────────
  const rightPanel = selectedSciNote ? (
    <MemberSciNoteExperimentsPanel
      sciNote={selectedSciNote}
      memberUserId={memberUserId}
      memberId={id ?? ""}
      onClose={() => handleSelectSciNote(selectedSciNote)}
    />
  ) : selectedReport ? (
    <MemberReportDetailPanel
      report={selectedReport}
      onClose={() => handleSelectReport(null)}
    />
  ) : null;

  // ── Breadcrumb ──────────────────────────────────────────────────────────
  const breadcrumb = (
    <div className="max-w-2xl mx-auto px-6">
      <button
        onClick={() => navigate("/home/members")}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors group"
      >
        <ChevronLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>团队成员</span>
        <span className="text-gray-300 mx-0.5">·</span>
        <span className="text-gray-900 font-medium">{student.name}</span>
      </button>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <MemberDetailLayout breadcrumb={breadcrumb} rightPanel={isDrilling ? rightPanel : null}>

      <ProfileCard
        student={student}
        paperCount={paperCount}
        reportCount={reportCount}
        noteCount={notes.length}
        onStudentChange={setStudent}
        canEdit={canEdit}
        isInstructor={isInstructor}
      />

      <section>
        <SectionHeading icon={<FileText size={12} />} title="基本信息" />
        <BasicInfoCard
          student={student}
          onUpdated={setStudent}
          canEdit={canEdit}
          isInstructor={isInstructor}
        />
      </section>

      <section>
        <SectionHeading icon={<BookOpen size={12} />} title="论文信息" count={paperCount} />
        <PapersCard
          studentId={student.id}
          onCountChange={setPaperCount}
          canEdit={canEdit}
        />
      </section>

      <ExperimentRecordsSection
        notes={notes}
        notesLoading={notesLoading}
        notesError={notesError}
        isInstructor={isInstructor}
        selectedSciNoteId={selectedSciNote?.id ?? null}
        onSelectSciNote={handleSelectSciNote}
      />

      <WeeklyReportsSection
        studentId={student.id}
        isInstructor={isInstructor}
        selectedReportId={selectedReport?.id ?? null}
        onSelectReport={handleSelectReport}
        onCountChange={setReportCount}
      />

    </MemberDetailLayout>
  );
}
