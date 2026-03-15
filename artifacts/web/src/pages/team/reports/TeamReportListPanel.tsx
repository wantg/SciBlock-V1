import React from "react";
import { CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";
import type { StudentWithReport } from "@/hooks/reports/useTeamReports";
import type { WeeklyReportStatus } from "@/types/weeklyReport";

interface Props {
  students: StudentWithReport[];
  selectedStudentId: string | null;
  onSelect: (s: StudentWithReport) => void;
  loading: boolean;
}

function StatusDot({ status }: { status: WeeklyReportStatus | null }) {
  if (!status) {
    return <XCircle size={15} className="text-gray-300 flex-shrink-0" />;
  }
  switch (status) {
    case "reviewed":
      return <CheckCircle size={15} className="text-green-500 flex-shrink-0" />;
    case "submitted":
    case "under_review":
      return <Clock size={15} className="text-blue-500 flex-shrink-0" />;
    case "needs_revision":
      return <AlertCircle size={15} className="text-red-500 flex-shrink-0" />;
    case "draft":
      return <Clock size={15} className="text-gray-400 flex-shrink-0" />;
    default:
      return <XCircle size={15} className="text-gray-300 flex-shrink-0" />;
  }
}

const DEGREE_LABEL: Record<string, string> = {
  bachelor: "本科",
  master: "硕士",
  phd: "博士",
};

export function TeamReportListPanel({ students, selectedStudentId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="w-64 flex-shrink-0 flex items-center justify-center border-r border-gray-100 bg-white">
        <span className="text-sm text-gray-400">加载中…</span>
      </div>
    );
  }

  const submitted = students.filter((s) => s.report && s.report.status !== "draft").length;
  const total = students.filter((s) => s.status === "active").length;

  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
      {/* Stats bar */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500">
          已提交 <span className="font-semibold text-gray-800">{submitted}</span> / {total} 人
        </p>
        <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: total ? `${(submitted / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto py-1">
        {students.map((s) => {
          const active = s.id === selectedStudentId;
          const reportStatus = s.report?.status ?? null;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={[
                "w-full text-left px-4 py-3 border-b border-gray-50 transition-colors flex items-center gap-3",
                active ? "bg-blue-50" : "hover:bg-gray-50",
              ].join(" ")}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-gray-600">{s.name.slice(0, 1)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium truncate ${active ? "text-blue-900" : "text-gray-800"}`}>
                    {s.name}
                  </span>
                  <StatusDot status={reportStatus} />
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {DEGREE_LABEL[s.degree] ?? s.degree}·{s.researchTopic.slice(0, 8)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
