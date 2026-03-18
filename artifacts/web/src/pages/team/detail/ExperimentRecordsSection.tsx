/**
 * ExperimentRecordsSection — 成员详情页"实验记录" section。
 *
 * Layer: section component (data-aware via props, not self-fetching).
 *
 * 职责：
 *  - 组合 SectionHeading + ExperimentRecordsCard + 权限门卫
 *  - 封装权限检查（isInstructor）与计数逻辑，使 MemberDetailPage 无需关心这些细节
 *  - 实验记录总数从 notes 数组计算，无需额外 state 或 callback
 *
 * 数据流：
 *  - notes / loading / error 由父组件通过 useMemberSciNotes 获取后传入
 *    （noteCount 同时被 ProfileCard 使用，因此数据保留在页面层）
 *  - 选中状态通过 selectedSciNoteId + onSelectSciNote 向上传递
 */

import { FlaskConical } from "lucide-react";
import { SectionHeading }       from "@/components/team/SectionHeading";
import ExperimentRecordsCard    from "./ExperimentRecordsCard";
import { SectionLockedNotice }  from "./SectionLockedNotice";
import type { SciNote }         from "@/types/scinote";

interface Props {
  notes:            SciNote[];
  notesLoading:     boolean;
  notesError:       string | null;
  isInstructor:     boolean;
  selectedSciNoteId: string | null;
  onSelectSciNote:  (note: SciNote) => void;
}

export function ExperimentRecordsSection({
  notes,
  notesLoading,
  notesError,
  isInstructor,
  selectedSciNoteId,
  onSelectSciNote,
}: Props) {
  const experimentCount = isInstructor
    ? notes.reduce((sum, n) => sum + (n.experimentCount ?? 0), 0)
    : undefined;

  return (
    <section>
      <SectionHeading
        icon={<FlaskConical size={12} />}
        title="实验记录"
        count={experimentCount}
      />
      {isInstructor ? (
        <ExperimentRecordsCard
          notes={notes}
          loading={notesLoading}
          error={notesError}
          onSelectSciNote={onSelectSciNote}
          selectedSciNoteId={selectedSciNoteId}
        />
      ) : (
        <SectionLockedNotice label="仅导师可查看成员实验记录" />
      )}
    </section>
  );
}
