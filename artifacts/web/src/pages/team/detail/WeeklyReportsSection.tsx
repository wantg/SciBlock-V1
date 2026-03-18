/**
 * WeeklyReportsSection — 成员详情页"周报" section。
 *
 * Layer: section component (data-aware via StudentReportsCard).
 *
 * 职责：
 *  - 组合 SectionHeading + StudentReportsCard + 权限门卫
 *  - 封装权限检查（isInstructor）
 *  - count 状态由 StudentReportsCard 通过 onCountChange 向上冒泡，
 *    再经 onCountChange prop 传递到 MemberDetailPage 供 ProfileCard 使用
 *
 * 权限规则：
 *  - 导师 → 只读列表，点击打开右侧面板
 *  - 其他所有人（包括学生查看自己的 profile）→ 锁定
 *    （学生在 /home/reports 个人周报页面管理自己的报告）
 *
 * 数据流：
 *  - studentId 用于 useStudentReports hook（内部由 StudentReportsCard 发起）
 *  - 选中状态通过 selectedReportId + onSelectReport 向上传递
 */

import { useState }             from "react";
import { ScrollText }           from "lucide-react";
import { SectionHeading }       from "@/components/team/SectionHeading";
import { StudentReportsCard }   from "./StudentReportsCard";
import { SectionLockedNotice }  from "./SectionLockedNotice";
import type { WeeklyReport }    from "@/types/weeklyReport";

interface Props {
  studentId:        string;
  isInstructor:     boolean;
  selectedReportId: string | null;
  onSelectReport:   (report: WeeklyReport | null) => void;
  /** Bubbles report count up to ProfileCard via MemberDetailPage. */
  onCountChange?:   (count: number) => void;
}

export function WeeklyReportsSection({
  studentId,
  isInstructor,
  selectedReportId,
  onSelectReport,
  onCountChange,
}: Props) {
  // Count is owned here so SectionHeading can display it;
  // it also bubbles up to MemberDetailPage via onCountChange for ProfileCard.
  const [count, setCount] = useState(0);

  function handleCountChange(n: number) {
    setCount(n);
    onCountChange?.(n);
  }

  return (
    <section>
      <SectionHeading
        icon={<ScrollText size={12} />}
        title="周报"
        count={isInstructor ? count : undefined}
      />
      {isInstructor ? (
        <StudentReportsCard
          studentId={studentId}
          selectedReportId={selectedReportId}
          onSelectReport={onSelectReport}
          onCountChange={handleCountChange}
        />
      ) : (
        <SectionLockedNotice label="仅导师可查看成员周报" />
      )}
    </section>
  );
}
