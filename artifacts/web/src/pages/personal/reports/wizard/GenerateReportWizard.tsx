/**
 * GenerateReportWizard — 自动汇总报告生成向导（3 步）
 *
 * Step 1: 多日期日历选择 + 填写报告标题
 *         - 点击日历日期切换选中/取消，选中日期高亮紫色
 *         - 有实验记录的日期显示小圆点
 *         - 至少选 1 个日期才能进入下一步
 *
 * Step 2: 候选实验列表（按日期分组）
 *         - 从 GET /reports/candidate-experiments?dates[]=... 拉取
 *         - 每组可展开/折叠，单条勾选或"全选该组"
 *         - 允许 0 条被选中（AI 生成"暂无实验"汇总）
 *
 * Step 3: 创建报告 → 保存日期 → 保存关联 → 触发 AI 汇总 → 轮询完成
 *
 * Props:
 *   onComplete(report) — 生成完成后回调，传入最终报告
 *   onCancel           — 取消向导
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, ArrowRight, Loader2, CheckCircle2, XCircle,
  FlaskConical, Square, CheckSquare, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  fetchExperimentDates,
  fetchCandidateExperiments,
  createReport,
  triggerGenerate,
  pollUntilGenerated,
  saveReportLinks,
  saveReportDates,
} from "@/api/weeklyReport";
import type { WeeklyReport, CandidateGroup } from "@/types/weeklyReport";
import { EXP_STATUS_COLORS, fmtDate } from "@/types/weeklyReport";

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3;

/** ISO YYYY-MM-DD string */
type DateStr = string;

function todayISO(): DateStr {
  return new Date().toISOString().slice(0, 10);
}

function toISO(year: number, month: number, day: number): DateStr {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 0=Sun … 6=Sat */
function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function fmtMonthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}

// ---------------------------------------------------------------------------
// Step 1 — Multi-date calendar + title
// ---------------------------------------------------------------------------

interface Step1Props {
  selectedDates: Set<DateStr>;
  onToggleDate: (date: DateStr) => void;
  title: string;
  onTitleChange: (t: string) => void;
  onNext: () => void;
  onCancel: () => void;
}

function Step1({ selectedDates, onToggleDate, title, onTitleChange, onNext, onCancel }: Step1Props) {
  const [experimentDates, setExperimentDates] = useState<Set<DateStr>>(new Set());
  const todayObj = new Date();
  const [viewYear, setViewYear]   = useState(todayObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayObj.getMonth() + 1);

  useEffect(() => {
    fetchExperimentDates(viewYear, viewMonth)
      .then((r) => setExperimentDates(new Set(r.dates)))
      .catch(() => setExperimentDates(new Set()));
  }, [viewYear, viewMonth]);

  const sortedSelected = [...selectedDates].sort();
  const canProceed = selectedDates.size >= 1;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">选择汇总日期</h3>
        <p className="text-sm text-gray-500">在日历上点击选取多个日期，蓝紫色圆点表示该日有实验记录。</p>
      </div>

      {/* Calendar with its own month-nav prop drilling */}
      <MiniCalendarControlled
        selectedDates={selectedDates}
        onToggle={onToggleDate}
        experimentDates={experimentDates}
        viewYear={viewYear}
        viewMonth={viewMonth}
        onViewChange={(y, m) => { setViewYear(y); setViewMonth(m); }}
      />

      {/* Selected chips */}
      {sortedSelected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sortedSelected.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onToggleDate(d)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200 transition-colors"
              title="点击取消选择"
            >
              {fmtDate(d)}
              <span className="text-violet-400">×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          请至少选择一个日期才能继续。
        </p>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">报告标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="例：2026年3月实验汇总"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <p className="text-xs text-gray-400 mt-1">留空将自动生成标题</p>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          下一步
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// Controlled version of MiniCalendar (month state lifted up to Step1)
interface MiniCalendarControlledProps {
  selectedDates: Set<DateStr>;
  onToggle: (date: DateStr) => void;
  experimentDates: Set<DateStr>;
  viewYear: number;
  viewMonth: number;
  onViewChange: (year: number, month: number) => void;
}

function MiniCalendarControlled({
  selectedDates, onToggle, experimentDates, viewYear, viewMonth, onViewChange,
}: MiniCalendarControlledProps) {
  const today = todayISO();

  const dayCount = daysInMonth(viewYear, viewMonth);
  const startDow = firstDayOfWeek(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 1) onViewChange(viewYear - 1, 12);
    else onViewChange(viewYear, viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) onViewChange(viewYear + 1, 1);
    else onViewChange(viewYear, viewMonth + 1);
  }

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: dayCount }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weekDayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} type="button"
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-800">{fmtMonthLabel(viewYear, viewMonth)}</span>
        <button onClick={nextMonth} type="button"
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {weekDayLabels.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} />;
          const iso = toISO(viewYear, viewMonth, day);
          const isFuture = iso > today;
          const isSelected = selectedDates.has(iso);
          const hasDot = experimentDates.has(iso);
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              disabled={isFuture}
              aria-label={iso}
              data-date={iso}
              aria-pressed={isSelected}
              onClick={() => !isFuture && onToggle(iso)}
              className={[
                "relative mx-auto flex flex-col items-center justify-center",
                "w-8 h-8 rounded-full text-xs font-medium transition-all",
                isFuture
                  ? "text-gray-200 cursor-not-allowed"
                  : isSelected
                  ? "bg-violet-600 text-white shadow-sm"
                  : isToday
                  ? "ring-1 ring-violet-400 text-violet-700 hover:bg-violet-50"
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {day}
              {hasDot && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                  isSelected ? "bg-violet-300" : "bg-violet-400"
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Candidate experiments grouped by date
// ---------------------------------------------------------------------------

interface Step2Props {
  selectedDates: Set<DateStr>;
  onBack: () => void;
  onNext: (selectedIds: string[]) => void;
}

function Step2({ selectedDates, onBack, onNext }: Step2Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [groups, setGroups]   = useState<CandidateGroup[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed]   = useState<Set<DateStr>>(new Set());

  const sortedDates = [...selectedDates].sort();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCheckedIds(new Set());

    fetchCandidateExperiments(sortedDates)
      .then((res) => {
        if (cancelled) return;
        setGroups(res.groups);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "加载失败");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);  // Deliberately run once — selectedDates doesn't change on this step

  function toggleOne(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleGroup(group: CandidateGroup) {
    const ids = group.experiments.map((e) => e.id);
    const allIn = ids.every((id) => checkedIds.has(id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allIn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleCollapse(date: DateStr) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  const totalCount = groups.reduce((s, g) => s + g.experiments.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">选择纳入汇总的实验记录</h3>
        <p className="text-sm text-gray-500">
          已选 {sortedDates.length} 个日期 · 请勾选要纳入本次周报的实验（可以一条不选）
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white min-h-[160px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-violet-500 mr-2" />
            <span className="text-sm text-gray-500">检索候选实验…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-10 text-red-500 text-sm gap-2">
            <XCircle size={16} /> {error}
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <FlaskConical size={28} className="text-gray-300" />
            <p className="text-sm text-gray-500">所选日期内没有实验记录</p>
            <p className="text-xs text-gray-400">可以直接继续，AI 将生成"暂无实验"汇总</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {groups.map((group) => {
              const groupIds = group.experiments.map((e) => e.id);
              const allChecked = groupIds.length > 0 && groupIds.every((id) => checkedIds.has(id));
              const someChecked = groupIds.some((id) => checkedIds.has(id));
              const isCollapsed = collapsed.has(group.date);
              const hasExps = group.experiments.length > 0;

              return (
                <div key={group.date}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50">
                    {hasExps ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className="shrink-0"
                      >
                        {allChecked ? (
                          <CheckSquare size={15} className="text-violet-600" />
                        ) : someChecked ? (
                          <CheckSquare size={15} className="text-violet-400 opacity-60" />
                        ) : (
                          <Square size={15} className="text-gray-400" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-gray-700 flex-1">
                      {fmtDate(group.date)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {group.experiments.length} 条实验
                      {someChecked && (
                        <span className="ml-1 text-violet-600 font-medium">
                          · 已选 {groupIds.filter((id) => checkedIds.has(id)).length}
                        </span>
                      )}
                    </span>
                    {hasExps && (
                      <button
                        type="button"
                        onClick={() => toggleCollapse(group.date)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Experiment rows */}
                  {!isCollapsed && hasExps && (
                    <div className="divide-y divide-gray-50">
                      {group.experiments.map((e) => {
                        const checked = checkedIds.has(e.id);
                        return (
                          <div
                            key={e.id}
                            className={`flex items-center px-4 py-2 gap-3 cursor-pointer transition-colors ${
                              checked ? "bg-violet-50" : "hover:bg-gray-50"
                            }`}
                            onClick={() => toggleOne(e.id)}
                          >
                            {checked ? (
                              <CheckSquare size={14} className="text-violet-600 shrink-0" />
                            ) : (
                              <Square size={14} className="text-gray-300 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate">{e.title}</p>
                              <p className="text-xs text-gray-400 truncate">{e.sciNoteTitle}</p>
                            </div>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                                EXP_STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {e.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!hasExps && (
                    <div className="px-4 py-2 text-xs text-gray-400 italic">该日期没有实验记录</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {checkedIds.size === 0 && !loading && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          未选任何实验记录 — AI 将生成一份注明"本周暂无实验"的汇总报告。
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={14} />
          上一步
        </button>
        <button
          onClick={() => onNext([...checkedIds])}
          disabled={loading}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          开始生成
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Create report → save dates → save links → trigger AI → poll
// ---------------------------------------------------------------------------

interface Step3Props {
  selectedDates: Set<DateStr>;
  selectedIds: string[];
  title: string;
  onComplete: (report: WeeklyReport) => void;
  onError: (msg: string) => void;
}

type Phase = "creating" | "dates" | "linking" | "generating" | "done" | "failed";

function Step3({ selectedDates, selectedIds, title, onComplete, onError }: Step3Props) {
  const [phase, setPhase]     = useState<Phase>("creating");
  const [failMsg, setFailMsg] = useState("");

  const sortedDates = [...selectedDates].sort();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // 1. Create report — weekStart/End = min/max of selected dates
        setPhase("creating");
        const weekStart = sortedDates[0]!;
        const weekEnd   = sortedDates[sortedDates.length - 1]!;
        const defaultTitle = sortedDates.length === 1
          ? `${fmtDate(weekStart)} 实验汇总`
          : `${fmtDate(weekStart)}–${fmtDate(weekEnd)} 实验汇总`;

        const report = await createReport({
          title: title.trim() || defaultTitle,
          weekStart,
          weekEnd,
          status: "draft",
        });
        if (cancelled) return;

        // 2. Save selected dates
        setPhase("dates");
        await saveReportDates(report.id, sortedDates);
        if (cancelled) return;

        // 3. Save experiment links (always, even if empty)
        setPhase("linking");
        await saveReportLinks(report.id, selectedIds);
        if (cancelled) return;

        // 4. Trigger AI generation
        setPhase("generating");
        await triggerGenerate(report.id);
        if (cancelled) return;

        // 5. Poll until done
        const finalReport = await pollUntilGenerated(report.id);
        if (cancelled) return;

        if (finalReport.generationStatus === "failed") {
          setPhase("failed");
          setFailMsg("汇总生成失败，请稍后重试。");
          onError("汇总生成失败");
        } else {
          setPhase("done");
          setTimeout(() => { if (!cancelled) onComplete(finalReport); }, 800);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "生成失败";
        setPhase("failed");
        setFailMsg(msg);
        onError(msg);
      }
    }

    void run();
    return () => { cancelled = true; };
  }, []);

  const phaseLabel: Record<Phase, string> = {
    creating:   "正在创建报告…",
    dates:      "正在保存日期…",
    linking:    "正在保存实验关联…",
    generating: "AI 自动汇总中…",
    done:       "",
    failed:     "",
  };

  const phaseNote: Record<Phase, string> = {
    creating:   "初始化报告记录",
    dates:      `保存 ${sortedDates.length} 个已选日期`,
    linking:    selectedIds.length > 0
                  ? `关联 ${selectedIds.length} 条实验记录`
                  : "保存空关联（将生成无实验汇总）",
    generating: "正在分析实验数据，生成结构化汇总报告",
    done:       "",
    failed:     "",
  };

  const phaseIndex: Record<Phase, number> = {
    creating: 0, dates: 1, linking: 2, generating: 3, done: 3, failed: -1,
  };

  const dots = ["creating", "dates", "linking", "generating"] as const;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      {(phase === "creating" || phase === "dates" || phase === "linking" || phase === "generating") && (
        <>
          <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-violet-600" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900 mb-1">{phaseLabel[phase]}</p>
            <p className="text-sm text-gray-500">{phaseNote[phase]}</p>
          </div>
          <div className="flex items-center gap-2">
            {dots.map((d, i) => (
              <span
                key={d}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === phaseIndex[phase]
                    ? "bg-violet-600 animate-pulse"
                    : i < phaseIndex[phase]
                    ? "bg-violet-300"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {phase === "done" && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={30} className="text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900 mb-1">汇总完成！</p>
            <p className="text-sm text-gray-500">即将跳转至报告详情…</p>
          </div>
        </>
      )}

      {phase === "failed" && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle size={30} className="text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900 mb-1">汇总失败</p>
            <p className="text-sm text-gray-500">{failMsg}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GenerateReportWizard (main)
// ---------------------------------------------------------------------------

interface Props {
  onComplete: (report: WeeklyReport) => void;
  onCancel: () => void;
}

export function GenerateReportWizard({ onComplete, onCancel }: Props) {
  const [step, setStep]                 = useState<Step>(1);
  const [title, setTitle]               = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<DateStr>>(new Set());
  const [selectedIds, setSelectedIds]   = useState<string[]>([]);
  const [genError, setGenError]         = useState<string | null>(null);

  const toggleDate = useCallback((date: DateStr) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }, []);

  const stepLabels: Record<Step, string> = {
    1: "选择日期",
    2: "选择实验",
    3: "生成报告",
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="max-w-xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <React.Fragment key={s}>
              <div
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  step === s
                    ? "text-violet-700"
                    : step > s
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === s
                      ? "bg-violet-600 text-white"
                      : step > s
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
                {stepLabels[s]}
              </div>
              {s < 3 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          {step === 1 && (
            <Step1
              selectedDates={selectedDates}
              onToggleDate={toggleDate}
              title={title}
              onTitleChange={setTitle}
              onNext={() => setStep(2)}
              onCancel={onCancel}
            />
          )}
          {step === 2 && (
            <Step2
              selectedDates={selectedDates}
              onBack={() => setStep(1)}
              onNext={(ids) => { setSelectedIds(ids); setGenError(null); setStep(3); }}
            />
          )}
          {step === 3 && !genError && (
            <Step3
              selectedDates={selectedDates}
              selectedIds={selectedIds}
              title={title}
              onComplete={onComplete}
              onError={setGenError}
            />
          )}
          {step === 3 && genError && (
            <div className="flex flex-col items-center gap-4 py-6">
              <XCircle size={36} className="text-red-400" />
              <p className="text-sm text-gray-700 text-center">{genError}</p>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  返回列表
                </button>
                <button
                  onClick={() => { setGenError(null); }}
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                >
                  重试
                </button>
              </div>
            </div>
          )}
        </div>

        {step < 3 && (
          <p className="text-xs text-gray-400 text-center">
            自动汇总基于你选择的实验记录数据生成，生成后仍可手动编辑或补充。
          </p>
        )}
      </div>
    </div>
  );
}
