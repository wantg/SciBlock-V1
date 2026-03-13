// ---------------------------------------------------------------------------
// Attribute tag — key / value pair on an object item
// ---------------------------------------------------------------------------

export interface Tag {
  id: string;
  /** Label type, e.g. "型号", "厂家", "规格", "粒径" */
  key: string;
  /** Tag content, e.g. "XXX-2000", "Thermo". Optional — a tag can be key-only. */
  value: string;
}

// ---------------------------------------------------------------------------
// Object item — a named entity with structured attribute tags
// ---------------------------------------------------------------------------

export interface ObjectItem {
  id: string;
  /** Primary name, e.g. "UV-Vis 分光光度计", "TiO₂ 纳米催化剂" */
  name: string;
  tags: Tag[];
}

// ---------------------------------------------------------------------------
// Field / category types
// ---------------------------------------------------------------------------

/**
 * "text"   — single text value (实验名称, 实验目标, 研究假设)
 * "list"   — flat list of string items
 * "object" — list of named items each with attribute tags (实验设备, 实验材料, 研究对象)
 */
export type FieldType = "text" | "list" | "object";

export interface ExperimentField {
  /** Stable React key — generated client-side */
  id: string;
  /** Field category name, e.g. "实验名称", "实验设备" */
  name: string;
  type: FieldType;

  // Always present; only the field matching the type carries meaningful data.
  /** For type === "text" */
  value: string;
  /** For type === "list" */
  items: string[];
  /** For type === "object" */
  objects: ObjectItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stable ID generator for new fields / items / tags */
export function genFieldId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Derive the experiment name from a field list.
 * Looks for a field named "实验名称"; falls back to "".
 */
export function getExperimentName(fields: ExperimentField[]): string {
  return fields.find((f) => f.name === "实验名称")?.value?.trim() ?? "";
}

/** Convenience: build a blank Tag */
export function makeTag(key = "", value = ""): Tag {
  return { id: genFieldId(), key, value };
}

/** Convenience: build a blank ObjectItem */
export function makeObjectItem(name = ""): ObjectItem {
  return { id: genFieldId(), name, tags: [] };
}

/** Convenience: build a blank ExperimentField with all data holders initialised */
export function makeField(
  name: string,
  type: FieldType,
  partial: Partial<Pick<ExperimentField, "value" | "items" | "objects">> = {},
): ExperimentField {
  return {
    id: genFieldId(),
    name,
    type,
    value: partial.value ?? "",
    items: partial.items ?? [],
    objects: partial.objects ?? [],
  };
}
