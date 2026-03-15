import React, { useState, useEffect } from "react";
import { useCurrentUser } from "@/contexts/UserContext";
import { fetchMyStudentProfile } from "@/api/users";
import type { StudentProfile } from "@/api/users";

export function IdentityBadge() {
  const { currentUser } = useCurrentUser();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null | "loading">(
    "loading",
  );

  const isStudent = currentUser?.role === "student";

  useEffect(() => {
    if (!isStudent) {
      setStudentProfile(null);
      return;
    }
    setStudentProfile("loading");
    fetchMyStudentProfile()
      .then((p) => setStudentProfile(p))
      .catch(() => setStudentProfile(null));
  }, [isStudent, currentUser?.id]);

  if (!currentUser) return null;

  const isInstructor = currentUser.role === "instructor";
  const displayName = currentUser.name || currentUser.email || "—";

  return (
    <div className="flex items-center gap-2 text-xs select-none">
      {isInstructor ? (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200 leading-none">
          导师
        </span>
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 leading-none">
          学生
        </span>
      )}

      <span className="text-gray-700 font-medium">{displayName}</span>

      {isStudent && (
        <>
          <span className="text-gray-300">·</span>
          {studentProfile === "loading" ? (
            <span className="text-gray-400">…</span>
          ) : studentProfile ? (
            <span className="text-gray-500">{studentProfile.name}</span>
          ) : (
            <span className="text-amber-600">未绑定学生档案</span>
          )}
        </>
      )}
    </div>
  );
}
