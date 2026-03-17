/**
 * PaperViewCard — 单篇论文只读展示卡片
 *
 * 标题行：论文类型标签 | 标题（点击展开摘要）| 悬停编辑/删除
 * 属性行：期刊 / 年份 / DOI / 上传日期 pill
 * 展开区：摘要文字 + 文件名
 *
 * Layer: detail sub-component
 */

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Paper } from "../../../types/team";
import { PaperTypeTag } from "../../../components/team/PaperTypeTag";
import { AttrPill }     from "../../../components/team/AttrPill";

export interface PaperViewCardProps {
  paper:     Paper;
  onEdit:    () => void;
  onDelete:  () => void;
  /** When false, edit/delete controls are hidden. */
  canEdit?:  boolean;
}

export function PaperViewCard({ paper, onEdit, onDelete, canEdit = true }: PaperViewCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm group">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <PaperTypeTag isThesis={paper.isThesis} />
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-1 text-sm font-medium text-gray-800 text-left hover:text-blue-700 transition-colors leading-snug min-w-0 truncate"
          title="点击展开/收起"
        >
          {paper.title}
        </button>
        {canEdit && (
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              title="编辑"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
              title="删除"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Attribute pills */}
      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        <AttrPill label="期刊" value={paper.journal} />
        <AttrPill label="年份" value={paper.year} />
        <AttrPill label="DOI"  value={paper.doi} />
        <AttrPill
          label="上传"
          value={new Date(paper.uploadedAt).toLocaleDateString("zh-CN")}
        />
      </div>

      {/* Expanded abstract */}
      {expanded && (paper.abstract || paper.fileName) && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50/40 rounded-b-lg">
          {paper.abstract && (
            <p className="text-xs text-gray-600 leading-relaxed">{paper.abstract}</p>
          )}
          {paper.fileName && (
            <p className="text-[10px] text-blue-500 mt-1">📎 {paper.fileName}</p>
          )}
        </div>
      )}
    </div>
  );
}
