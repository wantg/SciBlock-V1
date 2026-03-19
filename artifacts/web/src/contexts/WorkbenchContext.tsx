import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
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
import { generateReport } from "@/api/experiments";
import {
  DEFAULT_ONTOLOGY_VERSION,
  SEED_ONTOLOGY_VERSIONS,
} from "@/data/workbenchMockData";
import {
  createExperimentRecord,
  createExperimentRecordWithModules,
  blankAllModules,
  generateFlowDraft,
} from "@/data/workbenchUtils";
import {
  loadWorkbenchRecords,
  saveWorkbenchRecords,
} from "@/data/workbenchStorage";
import { useTrash } from "@/contexts/TrashContext";
import { useToast } from "@/hooks/use-toast";
import { useExperimentReport } from "@/hooks/useExperimentReport";
import {
  listExperiments,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  restoreExperiment,
  confirmExperiment,
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
  sequenceNumber: 0,
  confirmationState: "draft",
  derivedFromSourceType: "initial",
  derivedFromContextVer: 0,
};

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface WorkbenchContextValue {
  // SciNote-level metadata (read-only, from the parent SciNote)
  /** The title of the parent SciNote / project. Read-only display field. */
  sciNoteTitle: string;
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
  /**
   * Confirm-save the current record.
   * Calls POST /api/experiments/:id/confirm and replaces the record in state
   * with the server response (confirmationState → "confirmed").
   * No-op if the record has a local temp ID (not yet persisted server-side).
   */
  confirmRecord: () => Promise<void>;
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

  // Flow draft
  flowDraftInserted: boolean;

  /**
   * EditorPanel calls this on mount to register a function that can
   * insert HTML at the top of the TipTap document.
   * WorkbenchContext calls it when flow-draft logic triggers.
   */
  registerEditorInsert: (fn: (html: string) => void) => void;
  unregisterEditorInsert: () => void;
  /** Insert arbitrary HTML at the top of the editor (used by AI title assist). */
  insertIntoEditor: (html: string) => void;
  /** Persist the typed purpose to the current experiment record. */
  savePurposeInput: (v: string) => void;

  // AI Report
  /**
   * True when the current record is the chain head:
   *  - its confirmationState is "confirmed" or "confirmed_dirty" AND
   *  - its sequenceNumber is the highest among all confirmed/confirmed_dirty
   *    records in this SciNote.
   * Always false for draft records.
   */
  isCurrentRecordHead: boolean;

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

  // Keep wizard-derived modules available after initial render.
  // Used by createNewRecord to seed the FIRST experiment record with real data.
  const initialModulesRef = useRef<OntologyModule[] | undefined>(initialModules);

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
        // listExperiments already converts wire types; items are ExperimentRecord.
        const apiRecords = res.items;
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

  /**
   * Apply server-authoritative fields (confirmationState, confirmedAt,
   * confirmedModules) from a PATCH/POST response to whichever record
   * matches `recordId`.  Always call this after any successful
   * updateExperiment() so that transitions like confirmed → confirmed_dirty
   * are reflected in the UI.
   */
  function syncServerState(recordId: string, updated: ExperimentRecord) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              confirmationState: updated.confirmationState,
              confirmedAt: updated.confirmedAt,
            }
          : r,
      ),
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
    modulesDebounceRef.current = setTimeout(async () => {
      try {
        const updated = await updateExperiment(recordId, {
          currentModules: newModules,
        });
        // Sync confirmationState (confirmed → confirmed_dirty if the record
        // was already confirmed before this edit).
        syncServerState(recordId, updated);
      } catch {
        toast({
          title: "模块保存失败",
          description: "模块数据未能同步到服务器，请稍后重试",
          variant: "destructive",
        });
      }
    }, 1500);
  }

  // ---------------------------------------------------------------------------
  // Record actions
  // ---------------------------------------------------------------------------

  function switchRecord(recordId: string) {
    if (records.find((r) => r.id === recordId)) {
      setCurrentRecordId(recordId);
      setFlowDraftInserted(false);
    }
  }

  function moveToTrash(recordId: string) {
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx === -1) return;

    const record = records[idx];

    // Switch to an adjacent record before removal — only when other records exist.
    // When this is the last record the workbench transitions to the empty state;
    // no navigation is needed.
    if (records.length > 1) {
      const nextRecord = idx > 0 ? records[idx - 1] : records[idx + 1];
      setCurrentRecordId(nextRecord.id);
    }
    setFlowDraftInserted(false);

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
    // Determine which modules to seed the local temp record with.
    // - First record (records.length === 0): use wizard-derived initialModules so the
    //   user sees real content immediately while the POST is in flight.
    // - Subsequent records: use blankAllModules() — a full set of 5 empty-content
    //   module stubs.  The server response will replace this with the correct
    //   inherited modules.  We must NOT send [] here: MergeHeritableModules only
    //   appends heritable keys that were missing from base, so an empty base
    //   produces a result with only 4 heritable modules — the data module
    //   disappears.  Sending blank stubs ensures data is preserved in base
    //   (non-heritable, kept as-is) while heritable modules are overwritten by
    //   the chain defaults.
    const isFirstRecord = records.length === 0;
    const seedModules: OntologyModule[] = isFirstRecord && initialModulesRef.current
      ? initialModulesRef.current
      : blankAllModules();

    const localRecord = createExperimentRecordWithModules(sciNoteId, seedModules, records.length + 1);

    // Add locally with temp ID for instant feedback
    setRecords((prev) => [...prev, localRecord]);
    setCurrentRecordId(localRecord.id);
    setFlowDraftInserted(false);
    clearHighlights();

    // POST to API async; replace the entire local record with the server response
    // so inherited modules from the inheritance chain are applied correctly.
    //
    // For the first record: send the wizard modules as currentModules so the server
    // stores them as scinotes.initial_modules (the inheritance chain bootstrap).
    // For subsequent records: send blankAllModules() as the base so the server can:
    //   (a) replace heritable modules with inherited defaults from the chain, AND
    //   (b) keep the data module present (non-heritable, left as blank/fresh).
    createExperiment(sciNoteId, {
      title: localRecord.title || "未命名实验",
      purposeInput: localRecord.purposeInput,
      experimentStatus: localRecord.experimentStatus,
      experimentCode: localRecord.experimentCode,
      tags: localRecord.tags,
      currentModules: seedModules,
      inheritedVersionId: localRecord.inheritedOntologyVersionId,
    })
      .then((serverRecord) => {
        // Replace the entire local temp record with the server-authoritative record.
        // This ensures inherited modules (set by server-side inheritance logic) are
        // reflected in the UI immediately after creation.
        setRecords((prev) =>
          prev.map((r) => (r.id === localRecord.id ? serverRecord : r)),
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

  async function confirmRecord() {
    if (!isServerId(currentRecord.id)) return; // temp ID — server doesn't know this record yet
    try {
      const confirmed = await confirmExperiment(currentRecord.id);
      // Replace the entire record with the server response to get the updated
      // confirmationState, confirmedAt, and confirmed_modules fields.
      setRecords((prev) =>
        prev.map((r) => (r.id === confirmed.id ? confirmed : r)),
      );
    } catch {
      toast({
        title: "确认保存失败",
        description: "未能同步到服务器，请稍后重试",
        variant: "destructive",
      });
    }
  }

  function updateTitle(title: string) {
    const recId = currentRecord.id;
    patchCurrentRecord({ title });
    if (!isServerId(recId)) return; // skip if server UUID not yet assigned
    updateExperiment(recId, { title })
      .then((updated) => syncServerState(recId, updated))
      .catch(() => {
        toast({
          title: "保存失败",
          description: "标题未能同步到服务器",
          variant: "destructive",
        });
      });
  }

  function updateStatus(experimentStatus: ExperimentStatus) {
    const recId = currentRecord.id;
    patchCurrentRecord({ experimentStatus });
    if (!isServerId(recId)) return;
    updateExperiment(recId, { experimentStatus })
      .then((updated) => syncServerState(recId, updated))
      .catch(() => {
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
    const recId = currentRecord.id;
    patchCurrentRecord({ tags: newTags });
    if (!isServerId(recId)) return;
    updateExperiment(recId, { tags: newTags })
      .then((updated) => syncServerState(recId, updated))
      .catch(() => {
        toast({
          title: "保存失败",
          description: "标签未能同步到服务器",
          variant: "destructive",
        });
      });
  }

  function removeTag(tag: string) {
    const newTags = currentRecord.tags.filter((t) => t !== tag);
    const recId = currentRecord.id;
    patchCurrentRecord({ tags: newTags });
    if (!isServerId(recId)) return;
    updateExperiment(recId, { tags: newTags })
      .then((updated) => syncServerState(recId, updated))
      .catch(() => {
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
    editorDebounceRef.current = setTimeout(async () => {
      try {
        const updated = await updateExperiment(recId, { editorContent: html });
        syncServerState(recId, updated);
      } catch {
        toast({
          title: "保存失败",
          description: "编辑内容未能同步到服务器",
          variant: "destructive",
        });
      }
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
        // Auto-trigger: call backend AI generation for the current experiment
        setIsGeneratingReport(true);
        setReportError(false);
        generateReport(currentRecordId)
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
  // Report actions — delegated to useExperimentReport hook.
  //
  // isGeneratingReport / reportError state ownership stays here so that
  // setModuleStatus()'s auto-trigger path (Phase 2 work) can continue to
  // call setIsGeneratingReport / setReportError directly without change.
  // ---------------------------------------------------------------------------

  const {
    reportStatus,
    triggerReportGeneration,
    updateReport,
    clearReport,
  } = useExperimentReport({
    currentRecord,
    currentRecordId,
    isGenerating:       isGeneratingReport,
    hasError:           reportError,
    setIsGenerating:    setIsGeneratingReport,
    setHasError:        setReportError,
    setRecords,
    patchCurrentRecord,
  });

  // ---------------------------------------------------------------------------
  // Editor / AI assist bridge helpers (exposed to context consumers)
  // ---------------------------------------------------------------------------

  /** Insert arbitrary HTML at the top of the TipTap editor. */
  function insertIntoEditor(html: string) {
    editorInsertRef.current?.(html);
  }

  /** Persist the typed purpose string to the current experiment record. */
  function savePurposeInput(v: string) {
    patchCurrentRecord({ purposeInput: v });
  }

  // ---------------------------------------------------------------------------
  // Derived: chain-head status
  // ---------------------------------------------------------------------------

  /**
   * The current record is the chain head when it is confirmed/confirmed_dirty
   * AND has the highest sequenceNumber among all confirmed/confirmed_dirty
   * records.  Draft records are never the chain head.
   */
  const isCurrentRecordHead = useMemo(() => {
    if (currentRecord.confirmationState === "draft") return false;
    const confirmedSeqs = records
      .filter((r) => r.confirmationState !== "draft")
      .map((r) => r.sequenceNumber);
    if (confirmedSeqs.length === 0) return false;
    const chainHeadSeq = Math.max(...confirmedSeqs);
    return currentRecord.sequenceNumber === chainHeadSeq;
  }, [records, currentRecord]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value: WorkbenchContextValue = {
    sciNoteTitle,
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
    confirmRecord,
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
    flowDraftInserted,
    registerEditorInsert,
    unregisterEditorInsert,
    insertIntoEditor,
    savePurposeInput,
    isCurrentRecordHead,
    reportStatus,
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
