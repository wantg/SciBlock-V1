/**
 * ProfileCard — 学生 Profile Hero 卡片
 *
 * 结构：
 *   彩色渐变顶条
 *   主体区：头像 | 姓名 / 学位 / 年级 / 状态标签（可交互）/ 研究课题 / 联系方式
 *   统计栏：论文数 · 周报数 · 记录数
 *
 * Layer: detail sub-component
 */

import { Mail, Phone } from "lucide-react";
import type { Student, StudentStatus } from "../../../types/team";
import { DEGREE_LABELS } from "../../../types/team";
import { updateStudentStatus }  from "../../../api/team";
import { StudentStatusTag } from "../../../components/team/StudentStatusTag";

// ---------------------------------------------------------------------------
// Palette helper
// ---------------------------------------------------------------------------

const PALETTES = [
  { avatar: "bg-blue-500",    grad: "from-blue-400 to-blue-600"      },
  { avatar: "bg-violet-500",  grad: "from-violet-400 to-violet-600"  },
  { avatar: "bg-emerald-500", grad: "from-emerald-400 to-emerald-600" },
  { avatar: "bg-amber-500",   grad: "from-amber-400 to-amber-600"    },
  { avatar: "bg-rose-500",    grad: "from-rose-400 to-rose-600"      },
  { avatar: "bg-cyan-500",    grad: "from-cyan-400 to-cyan-600"      },
];

function palette(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTES[hash % PALETTES.length];
}

// ---------------------------------------------------------------------------
// StatBadge
// ---------------------------------------------------------------------------

function StatBadge({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-bold text-gray-900">{value}</span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileCard
// ---------------------------------------------------------------------------

export interface ProfileCardProps {
  student:         Student;
  paperCount:      number;
  reportCount:     number;
  noteCount:       number;
  onStudentChange: (updated: Student) => void;
  /** When false, the status tag is read-only and cannot be clicked. */
  canEdit?:        boolean;
}

export function ProfileCard({
  student,
  paperCount,
  reportCount,
  noteCount,
  onStudentChange,
  canEdit = true,
}: ProfileCardProps) {
  const pal = palette(student.name);

  async function handleStatusSave(next: StudentStatus) {
    const { student: updated } = await updateStudentStatus(student.id, next);
    onStudentChange(updated);
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      {/* Gradient top strip */}
      <div className={`h-1.5 bg-gradient-to-r ${pal.grad}`} />

      {/* Main content */}
      <div className="px-5 pt-4 pb-0">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {student.avatar ? (
            <img
              src={student.avatar}
              alt={student.name}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow-sm"
            />
          ) : (
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-sm ${pal.avatar}`}
            >
              {student.name.charAt(0)}
            </div>
          )}

          {/* Name / meta */}
          <div className="flex-1 min-w-0 pt-0.5">
            {/* Name row */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-gray-900 leading-none">
                {student.name}
              </h1>
              <span className="text-[10px] font-medium border rounded px-1.5 py-0.5 leading-none bg-gray-100 text-gray-500 border-gray-200">
                {DEGREE_LABELS[student.degree] ?? student.degree}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {student.enrollmentYear} 级
              </span>
              {/* Interactive status tag */}
              <StudentStatusTag
                status={student.status}
                onSave={handleStatusSave}
                stopPropagation={false}
                compact
                readonly={!canEdit}
              />
            </div>

            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
              {student.researchTopic}
            </p>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {student.email && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Mail size={10} className="flex-shrink-0" />
                  {student.email}
                </span>
              )}
              {student.phone && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Phone size={10} className="flex-shrink-0" />
                  {student.phone}
                </span>
              )}
              {!student.email && !student.phone && (
                <span className="text-[11px] text-gray-300 italic">暂无联系方式</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-4 mx-5 mb-4 border-t border-gray-100 pt-3 flex items-center justify-around">
        <StatBadge value={paperCount}  label="篇论文" />
        <div className="w-px h-6 bg-gray-100" />
        <StatBadge value={reportCount} label="份周报" />
        <div className="w-px h-6 bg-gray-100" />
        <StatBadge value={noteCount}   label="条记录" />
      </div>
    </div>
  );
}
