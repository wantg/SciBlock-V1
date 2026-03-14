/**
 * Structured data types for each ontology module.
 *
 * These types represent the domain-level entities inside each module,
 * as opposed to the flat `content: string` used by the legacy textarea.
 *
 * Import rules:
 *  - Module view/editor components import from here.
 *  - workbenchMockData imports from here.
 *  - WorkbenchContext deals with OntologyModule (from types/workbench) and
 *    references OntologyModuleStructuredData through the workbench type.
 */

// ---------------------------------------------------------------------------
// Attachment — per-item evidence / file metadata
// ---------------------------------------------------------------------------

export type AttachmentType = "image" | "video" | "document";

export interface AttachmentMeta {
  id: string;
  name: string;
  type: AttachmentType;
  /** Remote URL after a real upload; undefined for mock or pre-upload state. */
  url?: string;
  /** Blob / object URL for local preview (images only). Released on unmount. */
  localPreviewUrl?: string;
  /** File size in bytes. */
  size?: number;
  uploadedAt: string;
}

// ---------------------------------------------------------------------------
// System — research objects / apparatus
// ---------------------------------------------------------------------------

export interface SystemObject {
  id: string;
  /** Display name (e.g. "Si(100) 基底") */
  name: string;
  /** Role label (e.g. "研究基底" | "靶材" | "设备") */
  role: string;
  /** Short attribute chips (e.g. ["4英寸", "1–10 Ω·cm"]) */
  attributes: string[];
  description?: string;
  attachments?: AttachmentMeta[];
}

// ---------------------------------------------------------------------------
// Preparation — items needed before the experiment
// ---------------------------------------------------------------------------

export interface PrepItem {
  id: string;
  name: string;
  /** Category label (e.g. "基底清洗" | "表面活化" | "靶材处理") */
  category: string;
  duration?: string;
  description?: string;
  attachments?: AttachmentMeta[];
}

// ---------------------------------------------------------------------------
// Operation — ordered procedure steps
// ---------------------------------------------------------------------------

export interface OperationStep {
  id: string;
  order: number;
  name: string;
  /** Key parameters in condensed form (e.g. "RF 150 W, 5 min") */
  params?: string;
  notes?: string;
  attachments?: AttachmentMeta[];
}

// ---------------------------------------------------------------------------
// Measurement — characterization / measurement items
// ---------------------------------------------------------------------------

export interface MeasurementItem {
  id: string;
  name: string;
  instrument?: string;
  method?: string;
  /** What this measurement aims to determine */
  target: string;
  conditions?: string;
  attachments?: AttachmentMeta[];
}

// ---------------------------------------------------------------------------
// Data — output data items / variables
// ---------------------------------------------------------------------------

export interface DataItem {
  id: string;
  name: string;
  unit?: string;
  description?: string;
  attachments?: AttachmentMeta[];
}

// ---------------------------------------------------------------------------
// Aggregate — carried on OntologyModule.structuredData
// ---------------------------------------------------------------------------

export interface OntologyModuleStructuredData {
  systemObjects?: SystemObject[];
  prepItems?: PrepItem[];
  operationSteps?: OperationStep[];
  measurementItems?: MeasurementItem[];
  dataItems?: DataItem[];
}
