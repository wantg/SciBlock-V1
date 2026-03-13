import React from "react";
import { BookOpen } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

export function SciNoteDetailPage() {
  return (
    <AppLayout title="实验记录">
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <BookOpen size={36} className="text-gray-300 mb-4" />
        <p className="text-sm font-medium text-gray-500">实验记录详情</p>
        <p className="text-xs text-gray-400 mt-1">
          SciNote 内容编辑器 — 功能开发中
        </p>
      </div>
    </AppLayout>
  );
}
