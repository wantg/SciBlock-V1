/**
 * MembersPage — 团队成员总览（/home/members）
 *
 * Layer: page
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import type { Student, StudentStatus } from "../../types/team";
import { STATUS_LABELS } from "../../types/team";
import { fetchMembers } from "../../api/team";
import { useCurrentUser } from "../../contexts/UserContext";
import MemberCard  from "./MemberCard";
import InviteModal from "./InviteModal";

const STATUS_FILTERS: { value: StudentStatus | "all"; label: string }[] = [
  { value: "all",       label: "全部" },
  { value: "active",    label: "在读" },
  { value: "pending",   label: "待确认" },
  { value: "graduated", label: "已毕业" },
];

export default function MembersPage() {
  const [, navigate]    = useLocation();
  const { currentUser } = useCurrentUser();
  const isInstructor    = currentUser?.role === "instructor";
  const [students, setStudents] = useState<Student[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [filter, setFilter] = useState<StudentStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { members } = await fetchMembers();
      setStudents(members);
    } catch {
      setError("加载成员列表失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleInvited() {
    setShowInvite(false);
    void load();
  }

  /**
   * 状态更新回调：直接替换本地列表中对应学生，不重新加载全列表
   */
  function handleStatusChange(updated: Student) {
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  }

  const filtered = filter === "all" ? students : students.filter(s => s.status === filter);

  const counts = STATUS_FILTERS.slice(1).reduce<Record<string, number>>((acc, f) => {
    acc[f.value] = students.filter(s => s.status === f.value).length;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">团队成员</h1>
            <p className="text-sm text-gray-500 mt-1">
              共 {students.length} 位成员 · {counts.active ?? 0} 位在读
            </p>
          </div>
          {isInstructor && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              邀请成员
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
              {f.value !== "all" && counts[f.value] !== undefined && (
                <span className={`ml-1.5 text-xs ${filter === f.value ? "text-gray-300" : "text-gray-400"}`}>
                  {counts[f.value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">{error}</p>
            <button onClick={load} className="text-sm text-gray-700 underline">重新加载</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm font-medium text-gray-500">
              {filter === "all" ? "暂无团队成员" : `暂无${STATUS_LABELS[filter as StudentStatus]}成员`}
            </p>
            {filter === "all" && isInstructor && (
              <button
                onClick={() => setShowInvite(true)}
                className="mt-4 text-sm text-black underline"
              >
                立即邀请第一位成员
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(s => (
              <MemberCard
                key={s.id}
                student={s}
                onClick={() => navigate(`/home/members/${s.id}`)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onCreated={handleInvited}
        />
      )}
    </div>
  );
}
