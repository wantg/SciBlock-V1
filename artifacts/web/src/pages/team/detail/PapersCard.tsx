/**
 * PapersCard — 论文信息卡片区（发表论文 + 毕业论文）
 *
 * 每篇论文 = PaperViewCard（只读） 或 PaperEditForm（编辑中）
 * 新增论文 = 展开 PaperEditForm
 *
 * Layer: detail card component
 * Deps: usePapers (hook), PaperViewCard, PaperEditForm
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Paper, AddPaperRequest } from "../../../types/team";
import { usePapers }        from "../../../hooks/team/usePapers";
import { PaperViewCard }    from "./PaperViewCard";
import { PaperEditForm }    from "./PaperEditForm";

interface Props {
  studentId:      string;
  onCountChange?: (count: number) => void;
  /** When false, all write affordances (upload, edit, delete) are hidden. */
  canEdit?:       boolean;
}

// ---------------------------------------------------------------------------
// Sub-section (发表论文 / 毕业论文)
// ---------------------------------------------------------------------------

interface SectionProps {
  title:      string;
  isThesis:   boolean;
  items:      Paper[];
  adding:     "published" | "thesis" | null;
  editing:    Paper | null;
  onAdd:      (type: "published" | "thesis") => void;
  onEdit:     (p: Paper) => void;
  onSaveNew:  (data: AddPaperRequest) => Promise<void>;
  onSaveEdit: (oldId: string, data: AddPaperRequest) => Promise<void>;
  onDelete:   (id: string) => void;
  onCancel:   () => void;
  canEdit:    boolean;
}

function PaperSection({
  title, isThesis, items, adding, editing,
  onAdd, onEdit, onSaveNew, onSaveEdit, onDelete, onCancel, canEdit,
}: SectionProps) {
  const typeKey  = isThesis ? "thesis" : "published";
  const isAdding = adding === typeKey;

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-400">{title}</span>
        {canEdit && (
          <button
            onClick={() => onAdd(typeKey)}
            className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-0.5 transition-colors"
          >
            <Plus size={10} /> 上传
          </button>
        )}
      </div>

      {canEdit && isAdding && (
        <div className="mb-2">
          <PaperEditForm
            initial={{ isThesis }}
            onSave={onSaveNew}
            onCancel={onCancel}
          />
        </div>
      )}

      {items.length === 0 && !isAdding ? (
        <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg">
          <p className="text-xs text-gray-400">暂无{title}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map(p =>
            canEdit && editing?.id === p.id ? (
              <PaperEditForm
                key={p.id}
                initial={p}
                onSave={data => onSaveEdit(p.id, data)}
                onCancel={onCancel}
              />
            ) : (
              <PaperViewCard
                key={p.id}
                paper={p}
                onEdit={() => onEdit(p)}
                onDelete={() => onDelete(p.id)}
                canEdit={canEdit}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PapersCard({ studentId, onCountChange, canEdit = true }: Props) {
  const { papers, loading, addNewPaper, removePaper, replacePaper } =
    usePapers(studentId, onCountChange);

  const [adding,  setAdding]  = useState<"published" | "thesis" | null>(null);
  const [editing, setEditing] = useState<Paper | null>(null);

  function reset() { setAdding(null); setEditing(null); }

  async function handleSaveNew(data: AddPaperRequest) {
    await addNewPaper(data);
    reset();
  }

  async function handleSaveEdit(oldId: string, data: AddPaperRequest) {
    await replacePaper(oldId, data);
    reset();
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除该论文？")) return;
    await removePaper(id);
  }

  if (loading) {
    return <div className="text-center py-6 text-xs text-gray-400">加载中…</div>;
  }

  const sectionProps = {
    adding, editing,
    onAdd:      (type: "published" | "thesis") => { setAdding(type); setEditing(null); },
    onEdit:     (p: Paper) => { setEditing(p); setAdding(null); },
    onSaveNew:  handleSaveNew,
    onSaveEdit: handleSaveEdit,
    onDelete:   handleDelete,
    onCancel:   reset,
    canEdit,
  };

  return (
    <div>
      <PaperSection
        title="发表论文" isThesis={false}
        items={papers.filter(p => !p.isThesis)}
        {...sectionProps}
      />
      <PaperSection
        title="毕业论文" isThesis={true}
        items={papers.filter(p => p.isThesis)}
        {...sectionProps}
      />
    </div>
  );
}
