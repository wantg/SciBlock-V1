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
import { FLOW_TRIGGER_KEYS } from "@/types/workbench";
import {
  DEFAULT_ONTOLOGY_VERSION,
  SEED_ONTOLOGY_VERSIONS,
} from "@/data/workbenchMockData";
import {
  createExperimentRecord,
  mockPurposeAssist,
  generateFlowDraft,
} from "@/data/workbenchUtils";
import {
  loadWorkbenchRecords,
  saveWorkbenchRecords,
} from "@/data/workbenchStorage";
import { useTrash } from "@/contexts/TrashContext";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface WorkbenchContextValue {
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
  updateModuleContent: (key: OntologyModuleKey, content: string) => void;
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
  /** Extra records to seed (e.g. ones previously restored from trash). */
  extraRecords?: ExperimentRecord[];
  children: React.ReactNode;
}

export function WorkbenchProvider({
  sciNoteId,
  sciNoteTitle,
  extraRecords = [],
  children,
}: Props) {
  const trash = useTrash();

  const [ontologyVersions] = useState<OntologyVersion[]>(SEED_ONTOLOGY_VERSIONS);

  /**
   * Initialise the records list with THREE-tier priority:
   *
   *  1. Persisted records (sessionStorage) — records the user created/edited
   *     in the current browser tab before navigating away from the workbench.
   *     This is the SOURCE OF TRUTH for existing records.
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
    const seed = createExperimentRecord(sciNoteId, DEFAULT_ONTOLOGY_VERSION, 1);
    const seen = new Set<string>([seed.id]);
    const deduped = extraRecords.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    return [seed, ...deduped];
  });

  // Persist records to sessionStorage whenever they change so that navigating
  // away and back does NOT lose records the user created in this session.
  useEffect(() => {
    saveWorkbenchRecords(sciNoteId, records);
  }, [sciNoteId, records]);

  const [currentRecordId, setCurrentRecordId] = useState<string>(
    () => records[0].id,
  );

  const currentRecord = records.find((r) => r.id === currentRecordId) ?? records[0];

  // Layout
  const [focusMode, setFocusMode] = useState<WorkbenchFocusMode>("balanced");
  const [activeModuleKey, setActiveModuleKey] = useState<OntologyModuleKey>("system");

  // AI title assist
  const [aiAssistOpen, setAiAssistOpen] = useState(false);
  const [purposeInput, setPurposeInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Flow draft
  const [flowDraftInserted, setFlowDraftInserted] = useState(false);

  // Editor insert bridge (registered by EditorPanel)
  const editorInsertRef = useRef<((html: string) => void) | null>(null);

  const registerEditorInsert = useCallback((fn: (html: string) => void) => {
    editorInsertRef.current = fn;
  }, []);

  const unregisterEditorInsert = useCallback(() => {
    editorInsertRef.current = null;
  }, []);

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
  }

  function createNewRecord() {
    const latestVersion =
      ontologyVersions[ontologyVersions.length - 1] ?? DEFAULT_ONTOLOGY_VERSION;
    const next = createExperimentRecord(sciNoteId, latestVersion, records.length + 1);
    setRecords((prev) => [...prev, next]);
    setCurrentRecordId(next.id);
    setFlowDraftInserted(false);
    setAiAssistOpen(false);
    setPurposeInput("");
    clearHighlights();
  }

  function updateTitle(title: string) {
    patchCurrentRecord({ title });
  }

  function updateStatus(experimentStatus: ExperimentStatus) {
    patchCurrentRecord({ experimentStatus });
  }

  function updateExperimentCode(experimentCode: string) {
    patchCurrentRecord({ experimentCode });
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (currentRecord.tags.includes(trimmed)) return;
    patchCurrentRecord({ tags: [...currentRecord.tags, trimmed] });
  }

  function removeTag(tag: string) {
    patchCurrentRecord({ tags: currentRecord.tags.filter((t) => t !== tag) });
  }

  function updateEditorContent(html: string) {
    patchCurrentRecord({ editorContent: html });
  }

  // ---------------------------------------------------------------------------
  // Module actions
  // ---------------------------------------------------------------------------

  function updateModuleContent(key: OntologyModuleKey, content: string) {
    const now = new Date().toISOString();
    patchCurrentModules((modules) =>
      modules.map((m) =>
        m.key === key ? { ...m, content, status: "editing", updatedAt: now } : m,
      ),
    );
  }

  function updateModuleStructuredData(
    key: OntologyModuleKey,
    data: OntologyModuleStructuredData,
  ) {
    const now = new Date().toISOString();
    patchCurrentModules((modules) =>
      modules.map((m) =>
        m.key === key ? { ...m, structuredData: data, updatedAt: now } : m,
      ),
    );
  }

  function setModuleStatus(key: OntologyModuleKey, status: OntologyModuleStatus) {
    const now = new Date().toISOString();
    patchCurrentModules((modules) =>
      modules.map((m) =>
        m.key === key ? { ...m, status, updatedAt: now } : m,
      ),
    );

    // Check if all FLOW_TRIGGER_KEYS are now confirmed — if so, insert flow draft.
    if (status === "confirmed" && !flowDraftInserted) {
      setRecords((prev) => {
        const rec = prev.find((r) => r.id === currentRecordId);
        if (!rec) return prev;
        const updatedModules = rec.currentModules.map((m) =>
          m.key === key ? { ...m, status: "confirmed" as OntologyModuleStatus } : m,
        );
        const allConfirmed = FLOW_TRIGGER_KEYS.every(
          (k) => updatedModules.find((m) => m.key === k)?.status === "confirmed",
        );
        if (allConfirmed) {
          const triggerModules = updatedModules.filter((m) =>
            FLOW_TRIGGER_KEYS.includes(m.key),
          );
          const html = generateFlowDraft(triggerModules);
          editorInsertRef.current?.(html);
          setFlowDraftInserted(true);
        }
        return prev.map((r) =>
          r.id === currentRecordId ? { ...r, currentModules: updatedModules } : r,
        );
      });
    }
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
    updateModuleContent,
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
  };

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
}
