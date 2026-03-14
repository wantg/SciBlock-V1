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

/**
 * User-assigned quality status for an uploaded attachment.
 *
 *   合格   → green   (acceptable result)
 *   不合格  → red     (unacceptable result)
 *   待确认  → yellow  (pending review)
 *   undefined → not yet labelled
 */
export type AttachmentStatus = "合格" | "不合格" | "待确认";

export interface AttachmentMeta {
  id: string;
  name: string;
  type: AttachmentType;
  /**
   * User-assigned quality status label.
   * Persisted through sessionStorage alongside all other attachment metadata.
   */
  status?: AttachmentStatus;
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
  /** Category label — generic preparation type (e.g. "准备材料" | "准备设备" | "环境条件" | "前处理事项") */
  category: string;
  /** Structured key:value attributes (e.g. [{key:"用量", value:"20 mL"}, {key:"纯度", value:"AR"}]) */
  attributes: Tag[];
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
  /** Structured key:value parameter tags (e.g. [{key:"温度", value:"80 ℃"}, {key:"时间", value:"30 min"}]) */
  params: Tag[];
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
  /** Structured key:value condition tags (e.g. [{key:"波长", value:"664 nm"}, {key:"扫描范围", value:"200–800 nm"}]) */
  conditions: Tag[];
  attachments?: AttachmentMeta[];
}

// ---------------------------------------------------------------------------
// Data — output data items / variables
// ---------------------------------------------------------------------------

export interface DataItem {
  id: string;
  name: string;
  /** Structured key:value attributes (e.g. [{key:"单位", value:"mg/L"}, {key:"数据类型", value:"吸光度"}]) */
  attributes: Tag[];
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
