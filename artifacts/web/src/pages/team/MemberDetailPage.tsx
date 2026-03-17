/**
 * MemberDetailPage — 学生详情页（/home/members/:id）
 *
 * Layout:
 *   粘性面包屑栏
 *   Profile hero card
 *   Section × 4（基本信息 / 论文 / 实验记录 / 周报）
 *
 * Layer: page
 * Deps: useStudentDetail (hook), ProfileCard, SectionHeading (shared), 4 × Card
 */

import { useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  BookOpen, FileText, FlaskConical, ScrollText,
  GraduationCap,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStudentDetail }  from "../../hooks/team/useStudentDetail";
import { useSciNoteStore }   from "../../contexts/SciNoteStoreContext";
import { ProfileCard }       from "./detail/ProfileCard";
import { SectionHeading }    from "../../components/team/SectionHeading";
import BasicInfoCard         from "./detail/BasicInfoCard";
import PapersCard            from "./detail/PapersCard";
import ExperimentRecordsCard from "./detail/ExperimentRecordsCard";
import WeeklyReportsCard     from "./detail/WeeklyReportsCard";

export default function MemberDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { notes }    = useSciNoteStore();

  const { student, loading, error, setStudent } = useStudentDetail(id ?? "");

  const [paperCount,  setPaperCount]  = useState(0);
  const [reportCount, setReportCount] = useState(0);

  if (loading) {
    return (
      <AppLayout title="成员详情">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            <span className="text-xs text-gray-400">加载中…</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !student) {
    return (
      <AppLayout title="成员详情">
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
      </AppLayout>
    );
  }

  const breadcrumb = [
    { label: "团队成员", onClick: () => navigate("/home/members") },
    { label: student.name },
  ];

  return (
    <AppLayout title={student.name} breadcrumb={breadcrumb}>
      <div className="-mx-8 -my-8 flex-1 overflow-y-auto bg-gray-50/70">
      <div className="px-6 py-5 max-w-2xl mx-auto w-full flex flex-col gap-6">

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
          <SectionHeading icon={<FlaskConical size={12} />} title="实验记录" count={notes.length} />
          <ExperimentRecordsCard />
        </section>

        <section>
          <SectionHeading icon={<ScrollText size={12} />} title="周报" count={reportCount} />
          <WeeklyReportsCard studentId={student.id} onCountChange={setReportCount} />
        </section>

      </div>
      </div>
    </AppLayout>
  );
}
