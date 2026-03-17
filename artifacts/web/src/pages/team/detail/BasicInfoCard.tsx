/**
 * BasicInfoCard — 学生基本信息卡片（视图 + 编辑入口）
 *
 * 视图模式：学位标签 | 姓名 | 悬停编辑按钮 / 属性 pill 行
 * 编辑模式：展开为 BasicInfoEditForm
 *
 * Layer: detail card component
 * Deps: DegreePicker, BasicInfoEditForm, FieldPill (shared)
 */

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Student, UpdateStudentRequest } from "../../../types/team";
import { DEGREE_LABELS } from "../../../types/team";
import { updateStudent } from "../../../api/team";
import { FieldPill }        from "../../../components/team/FieldPill";
import { DegreePicker }     from "./DegreePicker";
import { BasicInfoEditForm } from "./BasicInfoEditForm";

interface Props {
  student:   Student;
  onUpdated: (s: Student) => void;
  /** When false, all edit affordances are hidden; card is read-only. */
  canEdit?:  boolean;
}

async function patchStudent(id: string, patch: UpdateStudentRequest): Promise<Student> {
  const { student } = await updateStudent(id, patch);
  return student;
}

export default function BasicInfoCard({ student, onUpdated, canEdit = true }: Props) {
  const [editingFull,   setEditingFull]   = useState(false);
  const [editingDegree, setEditingDegree] = useState(false);

  async function saveField(patch: UpdateStudentRequest) {
    const updated = await patchStudent(student.id, patch);
    onUpdated(updated);
  }

  if (canEdit && editingFull) {
    return (
      <BasicInfoEditForm
        student={student}
        onSave={s => { onUpdated(s); setEditingFull(false); }}
        onCancel={() => setEditingFull(false)}
      />
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm group">
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50">
        {canEdit && editingDegree ? (
          <DegreePicker
            value={student.degree}
            onSave={async v => { await saveField({ degree: v }); setEditingDegree(false); }}
            onCancel={() => setEditingDegree(false)}
          />
        ) : canEdit ? (
          <button
            onClick={() => setEditingDegree(true)}
            className="flex-shrink-0 text-[10px] font-semibold border rounded-md px-2 py-1 leading-none whitespace-nowrap bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 transition-colors"
            title="点击修改学位"
          >
            {DEGREE_LABELS[student.degree] ?? student.degree}
          </button>
        ) : (
          <span className="flex-shrink-0 text-[10px] font-semibold border rounded-md px-2 py-1 leading-none whitespace-nowrap bg-gray-50 text-gray-500 border-gray-200">
            {DEGREE_LABELS[student.degree] ?? student.degree}
          </span>
        )}

        {canEdit ? (
          <button
            onClick={() => setEditingFull(true)}
            className="flex-1 text-sm font-semibold text-gray-900 text-left hover:text-blue-600 transition-colors leading-snug min-w-0 truncate"
            title="点击编辑全部信息"
          >
            {student.name}
          </button>
        ) : (
          <span className="flex-1 text-sm font-semibold text-gray-900 leading-snug min-w-0 truncate">
            {student.name}
          </span>
        )}

        {canEdit && (
          <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditingFull(true)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-2 py-1 rounded-md transition-colors bg-white"
            >
              <Pencil size={10} /> 编辑
            </button>
          </div>
        )}
      </div>

      {/* Attribute pills */}
      <div className="px-4 py-3 flex flex-wrap gap-2">
        <FieldPill
          label="入学年份"
          value={`${student.enrollmentYear}年`}
          inputWidth="w-16"
          readonly={!canEdit}
          onSave={async v => saveField({
            enrollmentYear: parseInt(v.replace("年", "")) || student.enrollmentYear,
          })}
        />
        <FieldPill
          label="电话"
          value={student.phone ?? ""}
          inputWidth="w-28"
          readonly={!canEdit}
          onSave={async v => saveField({ phone: v || undefined })}
        />
        <FieldPill
          label="邮箱"
          value={student.email ?? ""}
          inputWidth="w-40"
          readonly={!canEdit}
          onSave={async v => saveField({ email: v || undefined })}
        />
        <FieldPill
          label="研究课题"
          value={student.researchTopic}
          inputWidth="w-56"
          multiline
          readonly={!canEdit}
          onSave={async v => saveField({ researchTopic: v })}
        />
      </div>
    </div>
  );
}
