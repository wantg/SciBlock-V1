/**
 * MemberDetailPage — 学生详情页（/home/members/:id）
 *
 * Layout（两种模式）：
 *
 *   单栏模式（默认，未选中项目时）:
 *     面包屑
 *     单列内容区（max-w-2xl，居中滚动）
 *
 *   双栏模式（选中某个 SciNote 项目后）：
 *     面包屑（全宽）
 *     ┌──────────────────────┬──────────────────┐
 *     │ 左栏：成员详情内容    │ 右栏：项目实验   │
 *     │ （独立滚动）          │ 记录面板         │
 *     │                      │ （独立滚动）      │
 *     └──────────────────────┴──────────────────┘
 *
 * 数据语义：
 *   - useMemberSciNotes(student.userId) — 被查看成员自己的 SciNotes
 *   - useMemberSciNoteExperiments — 被查看成员在某项目下的实验记录
 *   - 以上两个 hook 均调用 Go API 的 instructor-only 端点
 *   - student.userId（auth user ID）用于 Go API 查询；
 *     student.id（profile ID）用于 Express team API 查询
 *
 * Layer: page
 */

import { useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  BookOpen, FileText, FlaskConical, ScrollText,
  GraduationCap, ChevronLeft, Lock,
} from "lucide-react";
import { useStudentDetail }              from "../../hooks/team/useStudentDetail";
import { useMemberSciNotes }             from "../../hooks/team/useMemberSciNotes";
import { useCurrentUser }                from "../../contexts/UserContext";
import { ProfileCard }                   from "./detail/ProfileCard";
import { SectionHeading }                from "../../components/team/SectionHeading";
import BasicInfoCard                     from "./detail/BasicInfoCard";
import PapersCard                        from "./detail/PapersCard";
import ExperimentRecordsCard             from "./detail/ExperimentRecordsCard";
import WeeklyReportsCard                 from "./detail/WeeklyReportsCard";
import { MemberSciNoteExperimentsPanel } from "./detail/MemberSciNoteExperimentsPanel";
import type { SciNote }                  from "../../types/scinote";

export default function MemberDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { currentUser } = useCurrentUser();
  const isInstructor = currentUser?.role === "instructor";

  const { student, loading, error, setStudent } = useStudentDetail(id ?? "");

  // Only fetch member's SciNotes when the current user is an instructor.
  // Passing null skips the request entirely — useMemberSciNotes has a null guard.
  const memberUserId = student?.userId ?? null;
  const { notes, loading: notesLoading, error: notesError } = useMemberSciNotes(
    isInstructor ? memberUserId : null,
  );

  const [paperCount,      setPaperCount]      = useState(0);
  const [reportCount,     setReportCount]      = useState(0);
  const [selectedSciNote, setSelectedSciNote] = useState<SciNote | null>(null);

  // Toggle: clicking the same project deselects it
  function handleSelectSciNote(note: SciNote) {
    setSelectedSciNote((prev) => (prev?.id === note.id ? null : note));
  }

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

  const isDrilling = !!selectedSciNote;

  // ── Detail content (shared between single/dual column) ─────────────────
  const detailContent = (
    <div
      className={[
        "px-6 py-5 w-full flex flex-col gap-6",
        isDrilling ? "max-w-xl mx-auto" : "max-w-2xl mx-auto",
      ].join(" ")}
    >
      <ProfileCard
        student={student}
        paperCount={paperCount}
        reportCount={reportCount}
        noteCount={notes.length}
        onStudentChange={setStudent}
      />

      <section>
        <SectionHeading icon={<FileText size={12} />} title="基本信息" />
        <BasicInfoCard student={student} onUpdated={setStudent} />
      </section>

      <section>
        <SectionHeading icon={<BookOpen size={12} />} title="论文信息" count={paperCount} />
        <PapersCard studentId={student.id} onCountChange={setPaperCount} />
      </section>

      <section>
        <SectionHeading
          icon={<FlaskConical size={12} />}
          title="实验记录"
          count={isInstructor ? notes.length : undefined}
        />
        {isInstructor ? (
          <ExperimentRecordsCard
            notes={notes}
            loading={notesLoading}
            error={notesError}
            onSelectSciNote={handleSelectSciNote}
            selectedSciNoteId={selectedSciNote?.id ?? null}
          />
        ) : (
          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 text-gray-400">
            <Lock size={13} className="flex-shrink-0" />
            <span className="text-xs">仅导师可查看成员实验记录</span>
          </div>
        )}
      </section>

      <section>
        <SectionHeading icon={<ScrollText size={12} />} title="周报" count={reportCount} />
        <WeeklyReportsCard studentId={student.id} onCountChange={setReportCount} />
      </section>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/70">

      {/* ── 面包屑栏 ───────────────────────────────────────── */}
      <div className="flex-shrink-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-2.5">
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
      </div>

      {/* ── 内容区 ─────────────────────────────────────────── */}
      {!isDrilling ? (

        // 单栏模式：整体可滚动
        <div className="flex-1 overflow-y-auto">
          {detailContent}
        </div>

      ) : (

        // 双栏模式：左右各自独立滚动
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* 左栏：成员详情（独立滚动） */}
          <div className="flex-1 overflow-y-auto border-r border-gray-100 min-w-0">
            {detailContent}
          </div>

          {/* 右栏：实验记录面板（固定宽度，独立滚动） */}
          <div className="w-[400px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
            <MemberSciNoteExperimentsPanel
              sciNote={selectedSciNote}
              memberUserId={memberUserId}
              memberId={id ?? ""}
              onClose={() => setSelectedSciNote(null)}
            />
          </div>

        </div>
      )}

    </div>
  );
}
