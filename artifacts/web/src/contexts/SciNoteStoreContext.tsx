import React, { createContext, useContext, useState, useEffect } from "react";
import type { SciNote } from "@/types/scinote";
import type { WizardFormData } from "@/types/wizardForm";
import { getExperimentName } from "@/types/experimentFields";
import { loadSciNotes, saveSciNotes } from "@/data/scinoteStorage";
import { clearWorkbenchRecords } from "@/data/workbenchStorage";
import { useStorageSync } from "@/hooks/useStorageSync";
import { toast } from "@/hooks/use-toast";
import {
  listSciNotes,
  createSciNoteApi,
  updateSciNote,
  deleteSciNoteApi,
  type ApiSciNote,
} from "@/api/scinotes";

/**
 * SciNoteStoreContext — manages the personal SciNote list.
 *
 * Persistence strategy (API-first, localStorage cache):
 *   1. On mount: start with localStorage cache ([] for new users); then
 *      GET /api/scinotes replaces state with authoritative data.
 *      There is no placeholder fallback — an empty API response means
 *      the user has no SciNotes, which is the correct empty state.
 *   2. Create:   POST /api/scinotes → returns server UUID → update state.
 *   3. Rename / Reinitialize: optimistic update (state + localStorage) first,
 *      then PATCH /api/scinotes/:id in the background (fire-and-forget).
 *   4. Delete:   optimistic removal from state + localStorage, then
 *      DELETE /api/scinotes/:id in the background (fire-and-forget).
 *
 * Dependency rule: this context imports from data/ and api/ only.
 *                  It must NOT import from WorkbenchContext or TrashContext.
 */

function apiSciNoteToLocal(n: ApiSciNote): SciNote {
  return {
    id: n.id,
    title: n.title,
    kind: n.kind === "wizard" ? "wizard" : "placeholder",
    createdAt: n.createdAt,
    experimentType: n.experimentType ?? undefined,
    objective: n.objective ?? undefined,
    formData: n.formData ?? undefined,
  };
}

interface SciNoteStoreContextValue {
  notes: SciNote[];
  /** True while waiting for the initial GET /api/scinotes to complete. */
  loading: boolean;
  /** True once the API responded successfully on mount. */
  apiReady: boolean;
  /** Create a new SciNote from wizard form data. Returns the server-assigned id. */
  createSciNote: (formData: WizardFormData) => Promise<string>;
  /**
   * Rename an existing SciNote container.
   * Applies an optimistic update immediately; syncs to the API in the background.
   */
  renameSciNote: (id: string, newTitle: string) => void;
  /**
   * Overwrite the formData of an existing SciNote with fresh wizard output.
   * Applies an optimistic update immediately; syncs to the API in the background.
   */
  reinitializeSciNote: (id: string, newFormData: WizardFormData) => void;
  /** Optimistically removes the SciNote and soft-deletes via the API in the background. */
  deleteSciNote: (id: string) => void;
}

const SciNoteStoreContext = createContext<SciNoteStoreContextValue | null>(null);

export function SciNoteStoreProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<SciNote[]>(loadSciNotes);
  const [loading, setLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);

  // ---------------------------------------------------------------------------
  // Bootstrap: load from API. Initial state is localStorage cache ([] for new
  // users). The API response replaces it with authoritative data.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    listSciNotes()
      .then((res) => {
        if (cancelled) return;
        const apiNotes = res.items.map(apiSciNoteToLocal);
        setNotes(apiNotes);
        saveSciNotes(apiNotes);
        setApiReady(true);
      })
      .catch(() => {
        // API unavailable — keep whatever was loaded from localStorage cache.
        // Consumers should check apiReady === false to show an appropriate state.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Keep localStorage in sync on every state change (so the fallback stays fresh).
  // ---------------------------------------------------------------------------

  useEffect(() => {
    saveSciNotes(notes);
  }, [notes]);

  // ---------------------------------------------------------------------------
  // Cross-tab synchronization
  // ---------------------------------------------------------------------------

  useStorageSync<SciNote[]>({
    key: "sciblock:scinotes" as `sciblock:${string}`,
    onChange: (newNotes) => {
      if (newNotes && apiReady) {
        // 只有当 API 已就绪时才同步（避免初始化时的冲突）
        setNotes(newNotes);
      }
    },
  });

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async function createSciNote(formData: WizardFormData): Promise<string> {
    const fields = formData.step2.fields;
    const title = getExperimentName(fields) || "未命名实验";
    const experimentType = fields.find((f) => f.name === "实验类型")?.value?.trim() || undefined;
    const objective = fields.find((f) => f.name === "实验目标")?.value?.trim() || undefined;

    if (apiReady) {
      const created = await createSciNoteApi({
        title,
        kind: "wizard",
        experimentType,
        objective,
        formData,
      });
      const newNote = apiSciNoteToLocal(created);
      setNotes((prev) => [newNote, ...prev]);
      return newNote.id;
    }

    // Offline / unauthenticated fallback: local ID, localStorage only.
    const id = `exp-${Date.now()}`;
    const newNote: SciNote = {
      id,
      title,
      experimentType,
      objective,
      kind: "wizard",
      createdAt: new Date().toISOString(),
      formData,
    };
    setNotes((prev) => [newNote, ...prev]);
    return id;
  }

  function renameSciNote(id: string, newTitle: string) {
    const previousNotes = [...notes];
    const noteToRename = previousNotes.find((n) => n.id === id);
    
    if (!noteToRename) return;

    // 乐观更新
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title: newTitle } : n))
    );

    if (!apiReady) return;

    // API 调用和错误处理
    updateSciNote(id, { title: newTitle }).catch(() => {
      // 回滚
      setNotes(previousNotes);
      
      toast({
        title: "重命名失败",
        description: "笔记标题未能修改，请稍后重试",
        variant: "destructive",
      });
    });
  }

  function reinitializeSciNote(id: string, newFormData: WizardFormData) {
    const previousNotes = [...notes];
    const note = previousNotes.find((n) => n.id === id);
    if (!note) return;

    const fields = newFormData.step2.fields;
    const newTitle = getExperimentName(fields);
    const experimentType = fields.find((f) => f.name === "实验类型")?.value?.trim() || undefined;
    const objective = fields.find((f) => f.name === "实验目标")?.value?.trim() || undefined;

    // 乐观更新
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              title: newTitle || n.title,
              experimentType,
              objective,
              formData: newFormData,
              kind: "wizard" as const,
            }
          : n,
      )
    );

    if (!apiReady) return;

    updateSciNote(id, {
      title: newTitle || undefined,
      experimentType,
      objective,
      formData: newFormData,
    }).catch(() => {
      // 回滚
      setNotes(previousNotes);
      
      toast({
        title: "更新失败",
        description: "实验数据未能更新，请稍后重试",
        variant: "destructive",
      });
    });
  }

  async function deleteSciNote(id: string) {
    const previousNotes = [...notes];
    const deletedNote = previousNotes.find((n) => n.id === id);
    
    if (!deletedNote) return;

    // 乐观删除
    setNotes((prev) => prev.filter((n) => n.id !== id));
    clearWorkbenchRecords(id);

    if (!apiReady) return;

    try {
      await deleteSciNoteApi(id);
    } catch {
      // 恢复被删除的笔记
      setNotes(previousNotes);
      
      toast({
        title: "删除失败",
        description: "笔记未能删除，请稍后重试",
        variant: "destructive",
      });
    }
  }

  return (
    <SciNoteStoreContext.Provider
      value={{ notes, loading, apiReady, createSciNote, renameSciNote, reinitializeSciNote, deleteSciNote }}
    >
      {children}
    </SciNoteStoreContext.Provider>
  );
}

export function useSciNoteStore(): SciNoteStoreContextValue {
  const ctx = useContext(SciNoteStoreContext);
  if (!ctx) {
    throw new Error("useSciNoteStore must be used inside SciNoteStoreProvider");
  }
  return ctx;
}
