import React from "react";
import { useParams, Link } from "wouter";
import { BookOpen, Tag as TagIcon, FlaskConical } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSciNoteStore } from "@/contexts/SciNoteStoreContext";
import type { ExperimentField, ObjectItem } from "@/types/experimentFields";
import { getExperimentName } from "@/types/experimentFields";
import type { MeasurementItem, DataItem, OperationStep } from "@/types/ontologyModules";
import type { Step4Data, Step5Data, Step6Data } from "@/types/wizardForm";

// ---------------------------------------------------------------------------
// Read-only ObjectItem card (mirrors ObjectItemCard's visual style)
// ---------------------------------------------------------------------------

function ObjectItemSummary({ item }: { item: ObjectItem }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 pt-3 pb-3 flex flex-col gap-2">
      <p className="text-base font-semibold text-gray-800 leading-tight">
        {item.name || "—"}
      </p>
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
// Read-only FieldSummaryCard (mirrors FieldCard's structure)
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
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {field.value}
        </p>
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
        <div className="flex flex-col gap-2">
          {field.objects.map((obj) => (
            <ObjectItemSummary key={obj.id} item={obj} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step section — renders a titled group of fields, hidden if all empty
// ---------------------------------------------------------------------------

interface StepSectionProps {
  title: string;
  fields: ExperimentField[];
}

function StepSection({ title, fields }: StepSectionProps) {
  const hasContent = fields.some(
    (f) =>
      (f.type === "text" && f.value.trim()) ||
      (f.type === "list" && f.items.length > 0) ||
      (f.type === "object" && f.objects.length > 0),
  );
  if (!hasContent) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 mb-3">{title}</h2>
      <div className="flex flex-col gap-3">
        {fields.map((f) => (
          <FieldSummaryCard key={f.id} field={f} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Step4Section — read-only view for 实验操作 (new card format)
// Handles both new (items[]) and legacy (fields[]) step4 data.
// ---------------------------------------------------------------------------

function OperationStepSummary({ step }: { step: OperationStep }) {
  return (
    <div className="flex gap-3">
      {/* Step number circle */}
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
        <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
          {step.order}
        </span>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-lg px-3 py-2 flex flex-col gap-1.5">
        <p className="text-sm font-medium text-gray-800 leading-snug">
          {step.name || "—"}
        </p>
        {step.params.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {step.params.map((tag) => (
              <span
                key={tag.id}
                className="inline-block bg-slate-100 text-slate-600 text-xs rounded-full px-2.5 py-0.5"
              >
                {tag.value ? `${tag.key}: ${tag.value}` : tag.key}
              </span>
            ))}
          </div>
        )}
        {step.notes && (
          <p className="text-xs text-gray-400 leading-relaxed">{step.notes}</p>
        )}
      </div>
    </div>
  );
}

function Step4Section({ step4 }: { step4: Step4Data }) {
  // New format: items[]
  if (step4.items && step4.items.length > 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">实验操作</h2>
        <div className="flex flex-col gap-3">
          {step4.items.map((step) => (
            <OperationStepSummary key={step.id} step={step} />
          ))}
        </div>
      </section>
    );
  }
  // Legacy format: fields[]
  if (step4.fields && step4.fields.length > 0) {
    return <StepSection title="实验操作" fields={step4.fields} />;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step5Section — read-only view for 测量过程 (new card format)
// Handles both new (items[]) and legacy (fields[]) step5 data.
// ---------------------------------------------------------------------------

function MeasurementItemSummary({ item }: { item: MeasurementItem }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 pt-3 pb-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-base font-semibold text-gray-800 leading-tight">{item.name || "—"}</p>
        {item.instrument && (
          <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 leading-none">
            {item.instrument}
          </span>
        )}
      </div>
      {item.target && (
        <p className="text-sm text-gray-600 leading-relaxed">{item.target}</p>
      )}
      {item.method && (
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-0.5 w-fit">
          {item.method}
        </span>
      )}
      {item.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.conditions.map((tag) => (
            <span
              key={tag.id}
              className="inline-block bg-slate-100 text-slate-600 text-xs rounded-full px-2.5 py-0.5"
            >
              {tag.value ? `${tag.key}: ${tag.value}` : tag.key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Step5Section({ step5 }: { step5: Step5Data }) {
  // New format: items[]
  if (step5.items && step5.items.length > 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">测量过程</h2>
        <div className="flex flex-col gap-3">
          {step5.items.map((item) => (
            <MeasurementItemSummary key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }
  // Legacy format: fields[]
  if (step5.fields && step5.fields.length > 0) {
    return <StepSection title="测量过程" fields={step5.fields} />;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step6Section — read-only view for 实验数据 (new card format)
// Handles both new (items[]) and legacy (fields[]) step6 data.
// ---------------------------------------------------------------------------

function DataItemSummary({ item }: { item: DataItem }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 pt-3 pb-3 flex flex-col gap-2">
      <p className="text-base font-semibold text-gray-800 leading-tight">
        {item.name || "—"}
      </p>
      {item.attributes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.attributes.map((tag) => (
            <span
              key={tag.id}
              className="inline-block bg-slate-100 text-slate-600 text-xs rounded-full px-2.5 py-0.5"
            >
              {tag.value ? `${tag.key}: ${tag.value}` : tag.key}
            </span>
          ))}
        </div>
      )}
      {item.description && (
        <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
      )}
    </div>
  );
}

function Step6Section({ step6 }: { step6: Step6Data }) {
  // New format: items[]
  if (step6.items && step6.items.length > 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">实验数据</h2>
        <div className="flex flex-col gap-3">
          {step6.items.map((item) => (
            <DataItemSummary key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }
  // Legacy format: fields[]
  if (step6.fields && step6.fields.length > 0) {
    return <StepSection title="实验数据" fields={step6.fields} />;
  }
  return null;
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

  const fd = note.formData;
  const expType = fd?.step2.fields.find((f) => f.name === "实验类型")?.value;

  return (
    <AppLayout title={note.title}>
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-gray-900">
              {getExperimentName(fd?.step2.fields ?? []) || note.title}
            </h1>
            {expType && <p className="text-sm text-gray-400">{expType}</p>}
            {note.createdAt && (
              <p className="text-xs text-gray-300">
                创建于 {new Date(note.createdAt).toLocaleString("zh-CN")}
              </p>
            )}
          </div>
          <Link
            href={`/personal/experiment/${note.id}/workbench`}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 transition-colors px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            <FlaskConical size={14} />
            进入实验记录
          </Link>
        </div>

        {/* Steps 2–6 — unified field-based rendering */}
        {fd && (
          <>
            <StepSection title="实验系统" fields={fd.step2.fields} />
            <StepSection title="实验准备" fields={fd.step3.fields} />
            <Step4Section step4={fd.step4} />
            <Step5Section step5={fd.step5} />
            <Step6Section step6={fd.step6} />
          </>
        )}

        {!fd && (
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
