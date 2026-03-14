import React from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MeasurementItem, AttachmentMeta } from "@/types/ontologyModules";
import { ItemCard } from "./shared/ItemCard";
import { ItemField } from "./shared/ItemField";
import { AttachmentArea } from "./shared/AttachmentArea";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `meas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeMeasurement(): MeasurementItem {
  return { id: makeId(), name: "", target: "", attachments: [] };
}

// ---------------------------------------------------------------------------
// MeasurementItemForm — form for editing a single MeasurementItem
// ---------------------------------------------------------------------------

interface ItemProps {
  item: MeasurementItem;
  onChange: (updated: MeasurementItem) => void;
  onDelete: () => void;
}

function MeasurementItemForm({ item, onChange, onDelete }: ItemProps) {
  function set<K extends keyof MeasurementItem>(key: K, value: MeasurementItem[K]) {
    onChange({ ...item, [key]: value });
  }

  function updateAttachments(attachments: AttachmentMeta[]) {
    onChange({ ...item, attachments });
  }

  return (
    <ItemCard
      title={item.name || "新测量项"}
      subtitle={item.instrument}
      onDelete={onDelete}
    >
      {/* Name */}
      <ItemField label="测量项名称" required>
        <Input
          value={item.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="如：XRD 衍射表征"
          className="h-8 text-sm"
        />
      </ItemField>

      {/* Instrument */}
      <ItemField label="仪器 / 设备">
        <Input
          value={item.instrument ?? ""}
          onChange={(e) => set("instrument", e.target.value)}
          placeholder="如：Rigaku SmartLab"
          className="h-8 text-sm"
        />
      </ItemField>

      {/* Method */}
      <ItemField label="测量方法" hint="如：θ-2θ 扫描、掠入射 XRD…">
        <Input
          value={item.method ?? ""}
          onChange={(e) => set("method", e.target.value)}
          placeholder="如：θ-2θ 扫描 (10°–80°)"
          className="h-8 text-sm font-mono"
        />
      </ItemField>

      {/* Target */}
      <ItemField label="测量目标" required hint="本测量旨在确定什么？">
        <Textarea
          value={item.target}
          onChange={(e) => set("target", e.target.value)}
          placeholder="如：确认 ZnO 薄膜的晶体结构与 c 轴取向…"
          rows={2}
          className="resize-none text-sm"
        />
      </ItemField>

      {/* Conditions */}
      <ItemField label="测量条件">
        <Input
          value={item.conditions ?? ""}
          onChange={(e) => set("conditions", e.target.value)}
          placeholder="如：室温，步长 0.01°，速度 2°/min"
          className="h-8 text-sm"
        />
      </ItemField>

      {/* Attachments */}
      <AttachmentArea
        attachments={item.attachments ?? []}
        onChange={updateAttachments}
      />
    </ItemCard>
  );
}

// ---------------------------------------------------------------------------
// MeasurementModuleEditor — list manager for MeasurementItem[]
// ---------------------------------------------------------------------------

interface EditorProps {
  items: MeasurementItem[];
  onChange: (items: MeasurementItem[]) => void;
}

/**
 * MeasurementModuleEditor — structured editing UI for the 测量过程 module.
 *
 * Each measurement item is an `ItemCard` with name, instrument, method,
 * target description, conditions, and per-item attachment area.
 */
export function MeasurementModuleEditor({ items, onChange }: EditorProps) {
  function updateItem(id: string, updated: MeasurementItem) {
    onChange(items.map((m) => (m.id === id ? updated : m)));
  }

  function deleteItem(id: string) {
    onChange(items.filter((m) => m.id !== id));
  }

  function addItem() {
    onChange([...items, makeMeasurement()]);
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {items.length === 0 && (
        <p className="text-xs text-gray-300 py-1">
          尚无测量项，点击下方按钮添加第一个测量
        </p>
      )}

      {items.map((item) => (
        <MeasurementItemForm
          key={item.id}
          item={item}
          onChange={(updated) => updateItem(item.id, updated)}
          onDelete={() => deleteItem(item.id)}
        />
      ))}

      <button
        type="button"
        onClick={addItem}
        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 hover:border-gray-400 hover:text-gray-600 transition-colors w-full"
      >
        <Plus size={12} />
        新增测量项
      </button>
    </div>
  );
}
