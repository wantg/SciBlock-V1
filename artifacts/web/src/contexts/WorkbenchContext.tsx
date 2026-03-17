import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import type {
  OntologyModule,
  OntologyModuleKey,
  OntologyModuleStatus,
  OntologyVersion,
  ExperimentRecord,
  ExperimentStatus,
  WorkbenchFocusMode,
} from "@/types/workbench";
import type { OntologyModuleStructuredData } from "@/types/ontologyModules";
import type { ReportStatus } from "@/types/report";
import { FLOW_TRIGGER_KEYS, ALL_MODULE_KEYS } from "@/types/workbench";
import { generateExperimentReport } from "@/api/report";
import {
  DEFAULT_ONTOLOGY_VERSION,
  SEED_ONTOLOGY_VERSIONS,
} from "@/data/workbenchMockData";
import {
  createExperimentRecord,
  createExperimentRecordWithModules,
  mockPurposeAssist,
  generateFlowDraft,
} from "@/data/workbenchUtils";
import {
  loadWorkbenchRecords,
  saveWorkbenchRecords,
} from "@/data/workbenchStorage";
import { useTrash } from "@/contexts/TrashContext";
import { useToast } from "@/hooks/use-toast";
import {
  listExperiments,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  restoreExperiment,
  apiResponseToRecord,
} from "@/api/experiments";

// ---------------------------------------------------------------------------
// Empty-record sentinel — used as a safe fallback when records = [].
// Consumers must check records.length > 0 before treating currentRecord as real.
// ---------------------------------------------------------------------------
const EMPTY_RECORD: ExperimentRecord = {
  id: "__empty__",
  sciNoteId: "",
  title: "",
  purposeInput: undefined,
  experimentStatus: "探索中",
  experimentCode: "",
  tags: [],
  inheritedOntologyVersionId: "",
  currentModules: [],
  editorContent: "",
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface WorkbenchContextValue {
  // SciNote-level metadata (read-only, from the parent SciNote)
  experimentType?: string;
  objective?: string;

  // Data
  records: ExperimentRecord[];
  currentRecord: ExperimentRecord;
  ontologyVersions: OntologyVersion[];

  // Layout
  focusMode: WorkbenchFocusMode;
  setFocusMode: (mode: WorkbenchFocusMode) => void;
  activeModuleKey: OntologyModuleKey;
  setActiveModuleKey: (key: OntologyModuleKey) => void;

  // Record mutations
  switchRecord: (recordId: string) => void;
  createNewRecord: () => void;
  /** Move an unconfirmed record to the global trash (soft-delete). */
  moveToTrash: (recordId: string) => void;
  updateTitle: (title: string) => void;
  updateStatus: (status: ExperimentStatus) => void;
  updateExperimentCode: (code: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  updateEditorContent: (html: string) => void;

  // Module mutations
  updateModuleStructuredData: (key: OntologyModuleKey, data: OntologyModuleStructuredData) => void;
  setModuleStatus: (key: OntologyModuleKey, status: OntologyModuleStatus) => void;
  setModuleHighlights: (keys: OntologyModuleKey[]) => void;
  clearHighlights: () => void;

  // AI title assist
  aiAssistOpen: boolean;
  setAiAssistOpen: (open: boolean) => void;
  purposeInput: string;
  setPurposeInput: (v: string) => void;
  isGenerating: boolean;
  runAiAssist: () => void;

  // Flow draft
  flowDraftInserted: boolean;

  /**
   * EditorPanel calls this on mount to register a function that can
   * insert HTML at the top of the TipTap document.
   * WorkbenchContext calls it when AI or flow-draft logic triggers.
   */
  registerEditorInsert: (fn: (html: string) => void) => void;
  unregisterEditorInsert: () => void;

  // AI Report
  /** Derived from isGeneratingReport + currentRecord.reportHtml */
  reportStatus: ReportStatus;
  /** Manually trigger report generation (e.g. after partial confirm or retry). */
  triggerReportGeneration: () => void;
  /** Persist user-edited report HTML back to the record. */
  updateReport: (html: string) => void;
  /** Clear the generated report (reset to idle). */
  clearReport: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

export function useWorkbench(): WorkbenchContextValue {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error("useWorkbench must be used inside WorkbenchProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface Props {
  sciNoteId: string;
  /** Display title of the parent SciNote — stored in DeletedRecord on trash. */
  sciNoteTitle: string;
  /** 实验类型 from the parent SciNote — displayed in the workbench info bar. */
  experimentType?: string;
  /** 实验目标 from the parent SciNote — displayed in the workbench info bar. */
  objective?: string;
  /**
   * Pre-built module list derived from the wizard form data (via wizardToModules).
   * Used on the very first workbench visit instead of DEFAULT_ONTOLOGY_VERSION so
   * that wizard content is truly inherited rather than replaced by mock data.
   * Ignored on returning visits (persisted sessionStorage records take priority).
   */
  initialModules?: OntologyModule[];
  /** Extra records to seed (e.g. ones previously restored from trash). */
  extraRecords?: ExperimentRecord[];
  /**
   * If provided, the workbench opens directly on this experiment record
   * instead of defaulting to the first record. Used when navigating from the
   * home page "最近实验" feed via ?experimentId= query param.
   * The value is consumed once at mount; it does not track URL changes.
   */
  initialRecordId?: string;
  children: React.ReactNode;
}

export function WorkbenchProvider({
  sciNoteId,
  sciNoteTitle,
  experimentType,
  objective,
  initialModules,
  extraRecords = [],
  initialRecordId,
  children,
}: Props) {
  const trash = useTrash();
  const { toast } = useToast();

  const [ontologyVersions] = useState<OntologyVersion[]>(SEED_ONTOLOGY_VERSIONS);

  /**
   * Initialise the records list with THREE-tier priority:
   *
   *  1. Persisted records (sessionStorage cache) — records the user created/edited
   *     in the current browser tab before navigating away from the workbench.
   *     After mount the API bootstrap will replace this with authoritative data.
   *
   *  2. extraRecords (trash-restored) — records just returned from the trash.
   *     These are MERGED onto top of the persisted list, deduplicated by id.
   *     This guarantees restore = "add back", not "rebuild from scratch".
   *
   *  3. Seed record — only used when there are NO persisted records at all
   *     (genuine first visit to this workbench). Never injected over persisted
   *     data to avoid displacing records the user already created.
   */
  const [records, setRecords] = useState<ExperimentRecord[]>(() => {
    const persisted = loadWorkbenchRecords(sciNoteId);

    if (persisted.length > 0) {
      // --- Case A: returning visit — use persisted records as the base ---
      // Merge in any trash-restored extras (incremental, not a full replace).
      const existingIds = new Set(persisted.map((r) => r.id));
      const incoming = extraRecords.filter((r) => !existingIds.has(r.id));
      return [...persisted, ...incoming];
    }

    // --- Case B: first visit — no persisted data, start fresh ---
    // Prefer wizard-derived modules when available; fall back to mock data only
    // when the SciNote has no formData (e.g. legacy notes, non-wizard creation).
    const seed = initialModules
      ? createExperimentRecordWithModules(sciNoteId, initialModules, 1)
      : createExperimentRecord(sciNoteId, DEFAULT_ONTOLOGY_VERSION, 1);
    const seen = new Set<string>([seed.id]);
    const deduped = extraRecords.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    return [seed, ...deduped];
  });

  // Persist records to sessionStorage as a cache whenever they change.
  useEffect(() => {
    saveWorkbenchRecords(sciNoteId, records);
  }, [sciNoteId, records]);

  const [currentRecordId, setCurrentRecordId] = useState<string>(() => {
    if (initialRecordId) {
      const exists = records.some((r) => r.id === initialRecordId);
      if (exists) return initialRecordId;
    }
    return records[0]?.id ?? "";
  });

  const currentRecord = records.find((r) => r.id === currentRecordId) ?? records[0] ?? EMPTY_RECORD;

  // Layout
  const [focusMode, setFocusMode] = useState<WorkbenchFocusMode>("balanced");
  const [activeModuleKey, setActiveModuleKey] = useState<OntologyModuleKey>("system");

  // AI title assist
  const [aiAssistOpen, setAiAssistOpen] = useState(false);
  const [purposeInput, setPurposeInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Flow draft
  const [flowDraftInserted, setFlowDraftInserted] = useState(false);

  // Report generation
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(false);

  // Editor insert bridge (registered by EditorPanel)
  const editorInsertRef = useRef<((html: string) => void) | null>(null);

  // Debounce timers for high-frequency API writes
  const editorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modulesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Returns true if the ID is a server-assigned UUID (contains hyphens).
   * Local temp IDs are generated by generateId("rec") and look like "rec_xxx_yyy".
   * We skip API PATCH calls for records that have not yet received a server UUID,
   * because the server doesn't know about them until the bootstrap POST completes.
   */
  function isServerId(id: string): boolean {
    return id.includes("-") && !id.startsWith("rec_");
  }

  const registerEditorInsert = useCallback((fn: (html: string) => void) => {
    editorInsertRef.current = fn;
  }, []);

  const unregisterEditorInsert = useCallback(() => {
    editorInsertRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Bootstrap: load from API on mount, fall back to sessionStorage cache
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    listExperiments(sciNoteId)
      .then((res) => {
        if (cancelled) return;

        if (res.items.length === 0) {
          // First visit confirmed by API: no experiments exist on the server.
          // Clear the local seed record and show an empty state.
          // The user must explicitly click "+" to create their first experiment.
          setRecords([]);
          return;
        }

        // Existing experiments — replace state with API data.
        const apiRecords = res.items.map(apiResponseToRecord);
        setRecords(apiRecords);
        setCurrentRecordId((prev) => {
          // Priority 1: initialRecordId from ?experimentId query param — applies to
          // both first-visit and returning-visit paths as long as the target exists
          // in the server-authoritative record list.
          if (initialRecordId && apiRecords.some((r) => r.id === initialRecordId)) {
            return initialRecordId;
          }
          // Priority 2: keep current selection if it is still valid after API replace.
          // Covers returning-visit where user had already selected a different record.
          if (apiRecords.some((r) => r.id === prev)) {
            return prev;
          }
          // Priority 3: fall back to the first record (seed replaced by real data,
          // or initialRecordId not found in server result).
          return apiRecords[0].id;
        });
      })
      .catch(() => {
        // API unavailable — silently keep sessionStorage cache
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sciNoteId]);

  // ---------------------------------------------------------------------------
  // Restore: call API restore for any records coming from the trash pool
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (extraRecords.length === 0) return;
    for (const r of extraRecords) {
      if (!isServerId(r.id)) continue; // temp-ID records were never persisted server-side
      restoreExperiment(r.id).catch(() => {
        // Record is already in local state; API failure is a no-op here
        console.error("Failed to restore experiment via API:", r.id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  // ---------------------------------------------------------------------------
  // Record helpers
  // ---------------------------------------------------------------------------

  function patchCurrentRecord(patch: Partial<ExperimentRecord>) {
    setRecords((prev) =>
      prev.map((r) => (r.id === currentRecordId ? { ...r, ...patch } : r)),
    );
  }

  function patchCurrentModules(
    updater: (modules: OntologyModule[]) => OntologyModule[],
  ) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === currentRecordId
          ? { ...r, currentModules: updater(r.currentModules) }
          : r,
      ),
    );
  }

  /**
   * Debounce-schedule a PATCH for currentModules.
   * Always call with the computed new modules so the closure captures the
   * correct value at schedule time.
   */
  function scheduleModulesSync(recordId: string, newModules: OntologyModule[]) {
    if (!isServerId(recordId)) return; // skip if server UUID not yet assigned
    if (modulesDebounceRef.current) clearTimeout(modulesDebounceRef.current);
    modulesDebounceRef.current = setTimeout(() => {
      updateExperiment(recordId, { currentModules: newModules }).catch(() => {
        toast({
          title: "模块保存失败",
          description: "模块数据未能同步到服务器，请稍后重试",
          variant: "destructive",
        });
      });
    }, 1500);
  }

  // ---------------------------------------------------------------------------
  // Record actions
  // ---------------------------------------------------------------------------

  function switchRecord(recordId: string) {
    if (records.find((r) => r.id === recordId)) {
      setCurrentRecordId(recordId);
      setFlowDraftInserted(false);
      setAiAssistOpen(false);
    }
  }

  function moveToTrash(recordId: string) {
    // Guard 1: never trash the last remaining record
    if (records.length <= 1) return;

    const idx = records.findIndex((r) => r.id === recordId);
    if (idx === -1) return;

    const record = records[idx];

    // Switch to adjacent record before removal
    const nextRecord = idx > 0 ? records[idx - 1] : records[idx + 1];
    setCurrentRecordId(nextRecord.id);
    setFlowDraftInserted(false);
    setAiAssistOpen(false);

    // Remove from local active list
    setRecords((prev) => prev.filter((r) => r.id !== recordId));

    // Soft-delete: store in global trash (ontologyVersions untouched)
    trash.moveToTrash(record, sciNoteId, sciNoteTitle);

    // Soft-delete via API (fire-and-forget; local state already updated)
    // Only call if this is a server-assigned UUID (skip local temp IDs)
    if (isServerId(recordId)) {
      deleteExperiment(recordId).catch(() => {
        console.error("Failed to soft-delete experiment via API:", recordId);
      });
    }
  }

  function createNewRecord() {
    const latestVersion =
      ontologyVersions[ontologyVersions.length - 1] ?? DEFAULT_ONTOLOGY_VERSION;
    const localRecord = createExperimentRecord(sciNoteId, latestVersion, records.length + 1);

    // Add locally with temp ID for instant feedback
    setRecords((prev) => [...prev, localRecord]);
    setCurrentRecordId(localRecord.id);
    setFlowDraftInserted(false);
    setAiAssistOpen(false);
    setPurposeInput("");
    clearHighlights();

    // POST to API async; swap only the ID on success, preserving local content.
    // Use a fallback title because Go requires a non-empty title field.
    createExperiment(sciNoteId, {
      title: localRecord.title || "未命名实验",
      purposeInput: localRecord.purposeInput,
      experimentStatus: localRecord.experimentStatus,
      experimentCode: localRecord.experimentCode,
      tags: localRecord.tags,
      currentModules: localRecord.currentModules,
      inheritedVersionId: localRecord.inheritedOntologyVersionId,
    })
      .then((serverRecord) => {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === localRecord.id ? { ...r, id: serverRecord.id } : r,
          ),
        );
        setCurrentRecordId((prev) =>
          prev === localRecord.id ? serverRecord.id : prev,
        );
      })
      .catch(() => {
        toast({
          title: "创建失败",
          description: "实验记录未能同步到服务器，当前为本地缓存",
          variant: "destructive",
        });
      });
  }

  function updateTitle(title: string) {
    patchCurrentRecord({ title });
    if (!isServerId(currentRecord.id)) return; // skip if server UUID not yet assigned
    updateExperiment(currentRecord.id, { title }).catch(() => {
      toast({
        title: "保存失败",
        description: "标题未能同步到服务器",
        variant: "destructive",
      });
    });
  }

  function updateStatus(experimentStatus: ExperimentStatus) {
    patchCurrentRecord({ experimentStatus });
    if (!isServerId(currentRecord.id)) return;
    updateExperiment(currentRecord.id, { experimentStatus }).catch(() => {
      toast({
        title: "保存失败",
        description: "状态未能同步到服务器",
        variant: "destructive",
      });
    });
  }

  function updateExperimentCode(experimentCode: string) {
    patchCurrentRecord({ experimentCode });
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (currentRecord.tags.includes(trimmed)) return;
    const newTags = [...currentRecord.tags, trimmed];
    patchCurrentRecord({ tags: newTags });
    if (!isServerId(currentRecord.id)) return;
    updateExperiment(currentRecord.id, { tags: newTags }).catch(() => {
      toast({
        title: "保存失败",
        description: "标签未能同步到服务器",
        variant: "destructive",
      });
    });
  }

  function removeTag(tag: string) {
    const newTags = currentRecord.tags.filter((t) => t !== tag);
    patchCurrentRecord({ tags: newTags });
    if (!isServerId(currentRecord.id)) return;
    updateExperiment(currentRecord.id, { tags: newTags }).catch(() => {
      toast({
        title: "保存失败",
        description: "标签未能同步到服务器",
        variant: "destructive",
      });
    });
  }

  function updateEditorContent(html: string) {
    patchCurrentRecord({ editorContent: html });

    // Debounced PATCH — avoid high-frequency requests from TipTap
    if (editorDebounceRef.current) clearTimeout(editorDebounceRef.current);
    const recId = currentRecord.id;
    if (!isServerId(recId)) return; // skip if server UUID not yet assigned
    editorDebounceRef.current = setTimeout(() => {
      updateExperiment(recId, { editorContent: html }).catch(() => {
        toast({
          title: "保存失败",
          description: "编辑内容未能同步到服务器",
          variant: "destructive",
        });
      });
    }, 1500);
  }

  // ---------------------------------------------------------------------------
  // Module actions
  // ---------------------------------------------------------------------------

  function updateModuleStructuredData(
    key: OntologyModuleKey,
    data: OntologyModuleStructuredData,
  ) {
    const now = new Date().toISOString();
    const newModules = currentRecord.currentModules.map((m) =>
      m.key === key ? { ...m, structuredData: data, updatedAt: now } : m,
    );
    patchCurrentRecord({ currentModules: newModules });
    scheduleModulesSync(currentRecord.id, newModules);
  }

  function setModuleStatus(key: OntologyModuleKey, status: OntologyModuleStatus) {
    const now = new Date().toISOString();

    if (status !== "confirmed") {
      // Simple non-confirmed status update
      const newModules = currentRecord.currentModules.map((m) =>
        m.key === key ? { ...m, status, updatedAt: now } : m,
      );
      patchCurrentRecord({ currentModules: newModules });
      scheduleModulesSync(currentRecord.id, newModules);
      return;
    }

    // Confirmed path: need to trigger flow-draft and report generation
    setRecords((prev) => {
      const rec = prev.find((r) => r.id === currentRecordId);
      if (!rec) return prev;
      const updatedModules = rec.currentModules.map((m) =>
        m.key === key ? { ...m, status: "confirmed" as OntologyModuleStatus, updatedAt: now } : m,
      );

      // 1. Flow-draft: trigger when the 4 flow keys are all confirmed
      if (!flowDraftInserted) {
        const flowAllConfirmed = FLOW_TRIGGER_KEYS.every(
          (k) => updatedModules.find((m) => m.key === k)?.status === "confirmed",
        );
        if (flowAllConfirmed) {
          const triggerModules = updatedModules.filter((m) =>
            FLOW_TRIGGER_KEYS.includes(m.key),
          );
          const html = generateFlowDraft(triggerModules);
          editorInsertRef.current?.(html);
          setFlowDraftInserted(true);
        }
      }

      // 2. Report: auto-trigger when ALL 5 modules are confirmed AND no
      //    report exists yet for this record (avoid re-generating on re-confirm).
      const reportAllConfirmed = ALL_MODULE_KEYS.every(
        (k) => updatedModules.find((m) => m.key === k)?.status === "confirmed",
      );
      if (reportAllConfirmed && !rec.reportHtml && !isGeneratingReport) {
        // Trigger with updated modules (not the stale closure value)
        setIsGeneratingReport(true);
        setReportError(false);
        generateExperimentReport({
          title: rec.title,
          experimentType,
          objective,
          modules: updatedModules,
        })
          .then((html) => {
            setRecords((prev2) =>
              prev2.map((r) =>
                r.id === currentRecordId ? { ...r, reportHtml: html } : r,
              ),
            );
            setIsGeneratingReport(false);
          })
          .catch(() => {
            setIsGeneratingReport(false);
            setReportError(true);
          });
      }

      // Schedule modules sync with the updated modules
      scheduleModulesSync(currentRecordId, updatedModules);

      return prev.map((r) =>
        r.id === currentRecordId ? { ...r, currentModules: updatedModules } : r,
      );
    });
  }

  function setModuleHighlights(keys: OntologyModuleKey[]) {
    patchCurrentModules((modules) =>
      modules.map((m) => ({ ...m, isHighlighted: keys.includes(m.key) })),
    );
  }

  function clearHighlights() {
    patchCurrentModules((modules) =>
      modules.map((m) => ({ ...m, isHighlighted: false })),
    );
  }

  // ---------------------------------------------------------------------------
  // Report actions
  // ---------------------------------------------------------------------------

  /**
   * Compute reportStatus from transient flags + persisted record.
   * Kept as a plain function (not useMemo) so the value is always fresh
   * when consumed by the context value object below.
   */
  function computeReportStatus(
    rec: ExperimentRecord,
    generating: boolean,
    errored: boolean,
  ): ReportStatus {
    if (generating)    return "generating";
    if (errored)       return "error";
    if (rec.reportHtml) return "ready";
    return "idle";
  }

  function triggerReportGeneration() {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    setReportError(false);

    // Capture the modules at trigger time — async callback must not
    // close over stale state, so we read from the functional updater.
    const rec = records.find((r) => r.id === currentRecordId) ?? records[0];
    generateExperimentReport({
      title: rec.title,
      experimentType,
      objective,
      modules: rec.currentModules,
    })
      .then((html) => {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === currentRecordId ? { ...r, reportHtml: html } : r,
          ),
        );
        setIsGeneratingReport(false);
      })
      .catch(() => {
        setIsGeneratingReport(false);
        setReportError(true);
      });
  }

  function updateReport(html: string) {
    patchCurrentRecord({ reportHtml: html });
  }

  function clearReport() {
    patchCurrentRecord({ reportHtml: undefined });
    setReportError(false);
  }

  // ---------------------------------------------------------------------------
  // AI title assist
  // ---------------------------------------------------------------------------

  function runAiAssist() {
    if (!purposeInput.trim() || isGenerating) return;
    setIsGenerating(true);

    setTimeout(() => {
      const result = mockPurposeAssist(purposeInput);

      updateTitle(result.generatedTitle);
      setModuleHighlights(result.highlightedModuleKeys);

      const purposeHtml = `<h3>实验目的</h3><p>${result.purposeDraft}</p><hr>`;
      editorInsertRef.current?.(purposeHtml);

      patchCurrentRecord({ purposeInput });
      setIsGenerating(false);
      setAiAssistOpen(false);
      setPurposeInput("");
    }, 900);
  }

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value: WorkbenchContextValue = {
    experimentType,
    objective,
    records,
    currentRecord,
    ontologyVersions,
    focusMode,
    setFocusMode,
    activeModuleKey,
    setActiveModuleKey,
    switchRecord,
    createNewRecord,
    moveToTrash,
    updateTitle,
    updateStatus,
    updateExperimentCode,
    addTag,
    removeTag,
    updateEditorContent,
    updateModuleStructuredData,
    setModuleStatus,
    setModuleHighlights,
    clearHighlights,
    aiAssistOpen,
    setAiAssistOpen,
    purposeInput,
    setPurposeInput,
    isGenerating,
    runAiAssist,
    flowDraftInserted,
    registerEditorInsert,
    unregisterEditorInsert,
    reportStatus: computeReportStatus(currentRecord, isGeneratingReport, reportError),
    triggerReportGeneration,
    updateReport,
    clearReport,
  };

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
}
