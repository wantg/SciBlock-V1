/**
 * SectionLockedNotice — 成员详情页中权限不足时的通用锁定提示。
 *
 * Layer: presentational (zero logic).
 *
 * 使用场景：当前用户无权查看某个 section 的内容时，代替实际组件渲染。
 * 目前用于实验记录、周报两处，样式与实验记录原有设计一致。
 */

import { Lock } from "lucide-react";

interface Props {
  label: string;
}

export function SectionLockedNotice({ label }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 text-gray-400">
      <Lock size={13} className="flex-shrink-0" />
      <span className="text-xs">{label}</span>
    </div>
  );
}
