/**
 * MemberExperimentDetailPage — 成员实验记录只读详情页
 *
 * 路由: /home/members/:memberId/experiment/:sciNoteId/:experimentId
 *
 * 数据语义：
 *   - 属于 /home/members/ 路由树，不属于 /personal/
 *   - 完全不使用 WorkbenchContext / WorkbenchProvider / useSciNoteStore
 *   - 所有数据通过 instructor-only 端点读取被查看成员的数据
 *
 * 数据链路：
 *   useStudentDetail(memberId)
 *     → student.userId (auth user ID)
 *   useMemberExperiment(student.userId, experimentId)
 *     → GET /api/instructor/members/:userId/experiments/:experimentId
 *     → ExperimentRecord（成员自己的实验，不是登录用户的）
 *
 * Layer: page
 */

import { useParams, useLocation } from "wouter";
import { ChevronLeft, GraduationCap, FlaskConical } from "lucide-react";
import { useStudentDetail }       from "@/hooks/team/useStudentDetail";
import { useMemberExperiment }    from "@/hooks/team/useMemberExperiment";
import {
  STATUS_DOT_CLASS,
  STATUS_TEXT_CLASS,
  STATUS_BG_CLASS,
} from "@/types/calendarPanel";
import type { ExperimentRecord, ExperimentStatus, OntologyModule } from "@/types/workbench";
import type {
  SystemObject,
  PrepItem,
  OperationStep,
  MeasurementItem,
  DataItem,
  Tag,
} from "@/types/ontologyModules";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MODULE_TITLE: Record<string, string> = {
  system:       "实验系统",
  preparation:  "实验准备",
  operation:    "实验步骤",
  measurement:  "测量表征",
  data:         "数据记录",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
    hour:  "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Tag pills (key:value attributes / params / conditions)
// ---------------------------------------------------------------------------

function TagPills({ tags }: { tags: Tag[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {tags.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 text-[11px] text-slate-600"
        >
          <span className="font-medium">{t.key}</span>
          <span className="text-slate-400">·</span>
          <span>{t.value}</span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Read-only module sections — custom renderers, zero WorkbenchContext
// ---------------------------------------------------------------------------

function SystemObjectRow({ obj }: { obj: SystemObject }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded px-1.5 py-0.5 whitespace-nowrap">
          {obj.role}
        </span>
        <span className="text-sm font-medium text-gray-800 leading-snug">{obj.name || "（未命名）"}</span>
      </div>
      {obj.description && (
        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{obj.description}</p>
      )}
      <TagPills tags={obj.attributes ?? []} />
    </div>
  );
}

function PrepItemRow({ item }: { item: PrepItem }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 whitespace-nowrap">
          {item.category}
        </span>
        <span className="text-sm font-medium text-gray-800 leading-snug">{item.name || "（未命名）"}</span>
      </div>
      {item.description && (
        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{item.description}</p>
      )}
      <TagPills tags={item.attributes ?? []} />
    </div>
  );
}

function OperationStepRow({ step }: { step: OperationStep }) {
  return (
    <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5">
      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold mt-0.5">
        {step.order}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-snug">{step.name || "（未命名步骤）"}</p>
        {step.notes && (
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">{step.notes}</p>
        )}
        <TagPills tags={step.params ?? []} />
      </div>
    </div>
  );
}

function MeasurementItemRow({ item }: { item: MeasurementItem }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2.5">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-800">{item.name || "（未命名）"}</span>
        {item.instrument && (
          <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 rounded px-1.5 py-0.5">
            {item.instrument}
          </span>
        )}
        {item.method && (
          <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 rounded px-1.5 py-0.5">
            {item.method}
          </span>
        )}
      </div>
      {item.target && (
        <p className="mt-1 text-xs text-gray-500">
          <span className="font-medium">表征对象：</span>{item.target}
        </p>
      )}
      <TagPills tags={item.conditions ?? []} />
    </div>
  );
}

function DataItemRow({ item }: { item: DataItem }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2.5">
      <p className="text-sm font-medium text-gray-800">{item.name || "（未命名）"}</p>
      {item.description && (
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.description}</p>
      )}
      <TagPills tags={item.attributes ?? []} />
    </div>
  );
}

function ReadOnlyModuleSection({ module }: { module: OntologyModule }) {
  const sd = module.structuredData ?? {};
  const title  = MODULE_TITLE[module.key] ?? module.key;
  const isConf = module.status === "confirmed";

  const items: React.ReactNode[] = [];

  if (module.key === "system") {
    (sd.systemObjects ?? []).forEach((obj) =>
      items.push(<SystemObjectRow key={obj.id} obj={obj} />),
    );
  } else if (module.key === "preparation") {
    (sd.prepItems ?? []).forEach((item) =>
      items.push(<PrepItemRow key={item.id} item={item} />),
    );
  } else if (module.key === "operation") {
    (sd.operationSteps ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((step) =>
        items.push(<OperationStepRow key={step.id} step={step} />),
      );
  } else if (module.key === "measurement") {
    (sd.measurementItems ?? []).forEach((item) =>
      items.push(<MeasurementItemRow key={item.id} item={item} />),
    );
  } else if (module.key === "data") {
    (sd.dataItems ?? []).forEach((item) =>
      items.push(<DataItemRow key={item.id} item={item} />),
    );
  }

  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </h3>
        <span
          className={[
            "text-[10px] font-medium border rounded-full px-2 py-0.5",
            isConf
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-100 text-gray-500 border-gray-200",
          ].join(" ")}
        >
          {isConf ? "已确认" : "继承"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-2 pl-1">（该模块暂无内容）</p>
      ) : (
        <div className="flex flex-col gap-1.5">{items}</div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Experiment detail body
// ---------------------------------------------------------------------------

function ExperimentDetailBody({ record }: { record: ExperimentRecord }) {
  const status = record.experimentStatus as ExperimentStatus;

  const modules = record.currentModules ?? [];
  const hasEditor = record.editorContent && record.editorContent.trim().length > 0;
  const hasReport = record.reportHtml    && record.reportHtml.trim().length    > 0;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Title & meta ─────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900 leading-snug flex-1">
            {record.title || "（未命名实验）"}
          </h1>
          <span
            className={[
              "flex-shrink-0 flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1",
              STATUS_BG_CLASS[status] ?? "bg-gray-50 border-gray-200",
            ].join(" ")}
          >
            <span
              className={[
                "w-1.5 h-1.5 rounded-full",
                STATUS_DOT_CLASS[status] ?? "bg-gray-300",
              ].join(" ")}
            />
            <span className={STATUS_TEXT_CLASS[status] ?? "text-gray-500"}>
              {status}
            </span>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
          {record.experimentCode && (
            <span>
              <span className="font-medium text-gray-500">编号 </span>
              {record.experimentCode}
            </span>
          )}
          <span>
            <span className="font-medium text-gray-500">创建 </span>
            {formatDate(record.createdAt)}
          </span>
        </div>

        {record.tags && record.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {record.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[11px] bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {record.purposeInput && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              实验目的
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {record.purposeInput}
            </p>
          </div>
        )}
      </div>

      {/* ── Modules ──────────────────────────────────────── */}
      {modules.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">实验模块</h2>
          <div className="flex flex-col gap-5">
            {modules.map((mod) => (
              <ReadOnlyModuleSection key={mod.key} module={mod} />
            ))}
          </div>
        </div>
      )}

      {/* ── Editor content (TipTap HTML) ─────────────────── */}
      {hasEditor && (
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">实验笔记</h2>
          <div
            className="prose prose-sm prose-gray max-w-none text-gray-700 select-text"
            dangerouslySetInnerHTML={{ __html: record.editorContent }}
          />
        </div>
      )}

      {/* ── Report HTML ──────────────────────────────────── */}
      {hasReport && (
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">实验报告</h2>
          <div
            className="prose prose-sm prose-gray max-w-none text-gray-700 select-text"
            dangerouslySetInnerHTML={{ __html: record.reportHtml! }}
          />
        </div>
      )}

      {/* ── All-empty fallback ───────────────────────────── */}
      {modules.length === 0 && !hasEditor && !hasReport && (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-5 py-10 text-center">
          <FlaskConical size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">该实验记录暂无内容</p>
        </div>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MemberExperimentDetailPage() {
  const params = useParams<{
    memberId:     string;
    sciNoteId:    string;
    experimentId: string;
  }>();
  const [, navigate] = useLocation();

  const memberId     = params.memberId     ?? "";
  const experimentId = params.experimentId ?? "";

  const { student, loading: studentLoading } = useStudentDetail(memberId);
  const memberUserId = student?.userId ?? null;

  const { record, loading: recordLoading, error } = useMemberExperiment(
    memberUserId,
    experimentId,
  );

  const loading = studentLoading || recordLoading;

  // ── Loading ──────────────────────────────────────────
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

  // ── Error / not found ────────────────────────────────
  if (error || !record) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
        <GraduationCap size={32} className="text-gray-200" />
        <p className="text-sm">{error ?? "找不到该实验记录"}</p>
        <button
          onClick={() => navigate(`/home/members/${memberId}`)}
          className="text-xs text-black font-medium underline underline-offset-2"
        >
          返回成员详情
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/70">

      {/* ── 面包屑 ─────────────────────────────────────── */}
      <div className="flex-shrink-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-2.5">
        <div className="max-w-3xl mx-auto px-6">
          <button
            onClick={() => navigate(`/home/members/${memberId}`)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ChevronLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>团队成员</span>
            {student?.name && (
              <>
                <span className="text-gray-300 mx-0.5">·</span>
                <span className="text-gray-700">{student.name}</span>
              </>
            )}
            <span className="text-gray-300 mx-0.5">·</span>
            <span className="text-gray-900 font-medium truncate max-w-[160px]">
              {record.title || "实验记录"}
            </span>
          </button>
        </div>
      </div>

      {/* ── 内容区（可滚动） ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <ExperimentDetailBody record={record} />
        </div>
      </div>

    </div>
  );
}
