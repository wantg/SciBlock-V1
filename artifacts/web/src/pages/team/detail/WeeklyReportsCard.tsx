/**
 * WeeklyReportsCard — 周报卡片区
 *
 * 每份周报 = ReportCard（展开/收起）
 * 新增 = ReportAddForm
 *
 * Layer: detail card component
 * Deps: useWeeklyReports (hook), ReportCard, ReportAddForm
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { useWeeklyReports } from "../../../hooks/team/useWeeklyReports";
import { ReportCard }       from "./ReportCard";
import { ReportAddForm }    from "./ReportAddForm";

interface Props {
  studentId:      string;
  onCountChange?: (count: number) => void;
  /** When false, the "提交周报" button is hidden. */
  canEdit?:       boolean;
}

const INITIAL_LIMIT = 5;

export default function WeeklyReportsCard({ studentId, onCountChange, canEdit = true }: Props) {
  const { reports, loading, submitReport } =
    useWeeklyReports(studentId, onCountChange);

  const [showAll,  setShowAll]  = useState(false);
  const [showForm, setShowForm] = useState(false);

  const visible = showAll ? reports : reports.slice(0, INITIAL_LIMIT);

  if (loading) {
    return <p className="text-xs text-gray-400 py-4 text-center">加载中…</p>;
  }

  return (
    <div>
      {canEdit && showForm && (
        <ReportAddForm
          onSave={async data => { await submitReport(data); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {reports.length === 0 && !showForm ? (
        <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
          <p className="text-xs text-gray-400">暂无周报</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        {reports.length > INITIAL_LIMIT && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="flex-1 inline-flex items-center justify-center text-xs text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full py-1 transition-colors"
          >
            {showAll ? "收起" : `查看全部 ${reports.length} 份`}
          </button>
        )}
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 transition-colors"
          >
            <Plus size={10} /> 提交周报
          </button>
        )}
      </div>
    </div>
  );
}
