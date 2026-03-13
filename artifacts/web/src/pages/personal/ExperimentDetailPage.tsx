import React from "react";
import { useParams } from "wouter";
import { BookOpen, FlaskConical, Package, Wrench, BarChart2, Tag as TagIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSciNoteStore } from "@/contexts/SciNoteStoreContext";
import type { WizardFormData } from "@/types/wizardForm";
import type { ExperimentField, ObjectItem } from "@/types/experimentFields";
import { getExperimentName } from "@/types/experimentFields";

// ---------------------------------------------------------------------------
// Object item summary (read-only) — mirrors the ObjectItemCard editing card
// ---------------------------------------------------------------------------

function ObjectItemSummary({ item }: { item: ObjectItem }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 pt-3 pb-3 flex flex-col gap-2">
      <p className="text-base font-semibold text-gray-800 leading-tight">{item.name || "—"}</p>
      {item.tags.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <TagIcon size={11} />
            <span>属性标签</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-block bg-slate-100 text-slate-600 text-xs rounded-full px-2.5 py-0.5"
              >
                {tag.value ? `${tag.key}: ${tag.value}` : tag.key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 field rendering — mirrors the FieldEditor + FieldCard structure
// ---------------------------------------------------------------------------

function FieldSummaryCard({ field }: { field: ExperimentField }) {
  const isEmpty =
    field.type === "text"
      ? !field.value.trim()
      : field.type === "list"
        ? field.items.length === 0
        : field.objects.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">
        {field.name}
      </p>

      {isEmpty ? (
        <p className="text-sm text-gray-300 italic">未填写</p>
      ) : field.type === "text" ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{field.value}</p>
      ) : field.type === "list" ? (
        <ul className="flex flex-col gap-1">
          {field.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        /* object */
        <div className="flex flex-col gap-2">
          {field.objects.map((obj) => (
            <ObjectItemSummary key={obj.id} item={obj} />
          ))}
        </div>
      )}
    </div>
  );
}

function Step2Summary({ fields }: { fields: ExperimentField[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => (
        <FieldSummaryCard key={f.id} field={f} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Steps 3–5 simple info cards
// ---------------------------------------------------------------------------

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">{label}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {value || <span className="text-gray-300 italic">未填写</span>}
      </p>
    </div>
  );
}

function Steps35Summary({ data }: { data: WizardFormData }) {
  const { step3, step4, step5 } = data;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoCard icon={<Package size={14} />} label="所需材料" value={step3.materials} />
        <InfoCard
          icon={<FlaskConical size={14} />}
          label="实验环境 / 估计时长"
          value={[step3.environment, step3.estimatedTime].filter(Boolean).join(" · ")}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InfoCard icon={<Wrench size={14} />} label="操作步骤" value={step4.operationSteps} />
        <InfoCard icon={<Wrench size={14} />} label="注意事项" value={step4.cautions} />
      </div>
      <InfoCard
        icon={<BarChart2 size={14} />}
        label="测量指标 · 方法 · 仪器"
        value={[step5.metrics, step5.method, step5.instruments].filter(Boolean).join("\n")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { notes } = useSciNoteStore();
  const note = notes.find((n) => n.id === id);

  if (!note) {
    return (
      <AppLayout title="实验记录">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <BookOpen size={36} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">找不到该实验记录</p>
        </div>
      </AppLayout>
    );
  }

  const expType = note.formData?.step2.fields.find((f) => f.name === "实验类型")?.value;

  return (
    <AppLayout title={note.title}>
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-gray-900">
            {getExperimentName(note.formData?.step2.fields ?? []) || note.title}
          </h1>
          {expType && <p className="text-sm text-gray-400">{expType}</p>}
          {note.createdAt && (
            <p className="text-xs text-gray-300">
              创建于 {new Date(note.createdAt).toLocaleString("zh-CN")}
            </p>
          )}
        </div>

        {/* Step 2 — 实验系统 (dynamic fields) */}
        {note.formData && note.formData.step2.fields.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">实验系统</h2>
            <Step2Summary fields={note.formData.step2.fields} />
          </section>
        )}

        {/* Steps 3–5 */}
        {note.formData && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">实验详情</h2>
            <Steps35Summary data={note.formData} />
          </section>
        )}

        {!note.formData && (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 text-sm text-gray-400">
            该记录未包含初始化表单数据。
          </div>
        )}

        {/* Placeholder: experiment record content */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">实验记录内容</h2>
          <div className="bg-white rounded-xl border border-dashed border-gray-200 px-6 py-10 flex flex-col items-center justify-center text-center gap-2">
            <BookOpen size={28} className="text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">后续在这里进入正式实验记录流程</p>
            <p className="text-xs text-gray-300">实验记录编辑器 — 功能开发中</p>
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
