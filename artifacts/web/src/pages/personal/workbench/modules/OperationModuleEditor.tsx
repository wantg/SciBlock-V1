import React from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OperationStep, AttachmentMeta } from "@/types/ontologyModules";
import { ItemCard } from "./shared/ItemCard";
import { ItemField } from "./shared/ItemField";
import { AttachmentArea } from "./shared/AttachmentArea";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeStep(order: number): OperationStep {
  return { id: makeId(), order, name: "", attachments: [] };
}

// ---------------------------------------------------------------------------
// OperationStepItem — form for editing a single OperationStep
// ---------------------------------------------------------------------------

interface ItemProps {
  step: OperationStep;
  onChange: (updated: OperationStep) => void;
  onDelete: () => void;
}

function OperationStepItem({ step, onChange, onDelete }: ItemProps) {
  function set<K extends keyof OperationStep>(key: K, value: OperationStep[K]) {
    onChange({ ...step, [key]: value });
  }

  function updateAttachments(attachments: AttachmentMeta[]) {
    onChange({ ...step, attachments });
  }

  return (
    <ItemCard
      title={step.name || `步骤 ${step.order}`}
      subtitle={`#${step.order}`}
      onDelete={onDelete}
    >
      {/* Step name */}
      <ItemField label="步骤名称" required>
        <Input
          value={step.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="如：装载基底，腔室抽至本底真空"
          className="h-8 text-sm"
        />
      </ItemField>

      {/* Params */}
      <ItemField
        label="关键参数"
        hint="以简短格式记录本步骤的关键量（如功率、温度、时长）"
      >
        <Input
          value={step.params ?? ""}
          onChange={(e) => set("params", e.target.value)}
          placeholder="如：RF 150 W, 5 min, Ar 20 sccm"
          className="h-8 text-sm font-mono"
        />
      </ItemField>

      {/* Notes */}
      <ItemField label="备注 / 注意事项">
        <Textarea
          value={step.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="操作注意事项、安全提示或观察要点…"
          rows={2}
          className="resize-none text-sm"
        />
      </ItemField>

      {/* Attachments */}
      <AttachmentArea
        attachments={step.attachments ?? []}
        onChange={updateAttachments}
      />
    </ItemCard>
  );
}

// ---------------------------------------------------------------------------
// OperationModuleEditor — list manager for OperationStep[]
// ---------------------------------------------------------------------------

interface EditorProps {
  steps: OperationStep[];
  onChange: (steps: OperationStep[]) => void;
}

/**
 * OperationModuleEditor — structured editing UI for the 实验操作 module.
 *
 * Each step is an `ItemCard` with a numbered subtitle, name, params (monospace
 * input), notes textarea, and per-step attachment area. Steps are displayed
 * in insertion order; the `order` field is kept in sync on add/delete.
 */
export function OperationModuleEditor({ steps, onChange }: EditorProps) {
  function updateItem(id: string, updated: OperationStep) {
    onChange(steps.map((s) => (s.id === id ? updated : s)));
  }

  function deleteItem(id: string) {
    // Re-number remaining steps after deletion
    const remaining = steps
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    onChange(remaining);
  }

  function addItem() {
    onChange([...steps, makeStep(steps.length + 1)]);
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {steps.length === 0 && (
        <p className="text-xs text-gray-300 py-1">
          尚无操作步骤，点击下方按钮添加第一步
        </p>
      )}

      {steps.map((step) => (
        <OperationStepItem
          key={step.id}
          step={step}
          onChange={(updated) => updateItem(step.id, updated)}
          onDelete={() => deleteItem(step.id)}
        />
      ))}

      <button
        type="button"
        onClick={addItem}
        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 hover:border-gray-400 hover:text-gray-600 transition-colors w-full"
      >
        <Plus size={12} />
        新增步骤
      </button>
    </div>
  );
}
