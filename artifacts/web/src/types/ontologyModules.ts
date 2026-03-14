/**
 * Structured data types for each ontology module.
 *
 * Import rules:
 *  - Module view/editor components import from here.
 *  - workbenchMockData imports from here.
 *  - WorkbenchContext references OntologyModuleStructuredData through workbench types.
 */

import type { Tag } from "@/types/experimentFields";
export type { Tag };

// ---------------------------------------------------------------------------
// Attachment — per-item evidence / file metadata
// ---------------------------------------------------------------------------

export type AttachmentType = "image" | "video" | "document";

export interface AttachmentMeta {
  id: string;
  name: string;
  type: AttachmentType;
  /** Remote URL after a real upload. */
  url?: string;
  /** Blob URL for local image preview. Must be revoked on delete. */
  localPreviewUrl?: string;
  size?: number;
  uploadedAt: string;
}

// ---------------------------------------------------------------------------
// System — research objects / apparatus
// ---------------------------------------------------------------------------

export interface SystemObject {
  id: string;
  name: string;
  /** Role label (e.g. "研究基底" | "靶材" | "设备") */
  role: string;
  /** Structured key:value attribute tags (e.g. [{key:"尺寸", value:"4英寸"}]) */
  attributes: Tag[];
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
  /** Quantity / specification (e.g. "20 mL, 分析纯") */
  spec?: string;
  /** Pre-treatment method (e.g. "超声 15 min") */
  treatment?: string;
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
