/**
 * useMemberExperiment — fetches a single experiment record owned by a member.
 *
 * Layer: business logic hook (no UI).
 *
 * Calls GET /api/instructor/members/:userId/experiments/:experimentId
 * (instructor-only endpoint).
 *
 * @param userId        The member's auth user ID (student.userId, NOT student.id).
 *                      Pass null to skip the fetch.
 * @param experimentId  The experiment record ID.
 */

import { useState, useEffect } from "react";
import { fetchMemberExperiment } from "@/api/memberSciNotes";
import type { ExperimentRecord } from "@/types/workbench";

export interface UseMemberExperimentResult {
  record:  ExperimentRecord | null;
  loading: boolean;
  error:   string | null;
}

export function useMemberExperiment(
  userId:       string | null,
  experimentId: string,
): UseMemberExperimentResult {
  const [record,  setRecord]  = useState<ExperimentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !experimentId) {
      setRecord(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMemberExperiment(userId, experimentId)
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch(() => {
        if (!cancelled) setError("加载实验详情失败，请重试");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, experimentId]);

  return { record, loading, error };
}
