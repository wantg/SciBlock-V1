import React from "react";
import { FlaskConical } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

export function NewExperimentPage() {
  return (
    <AppLayout title="新建实验记录">
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FlaskConical size={36} className="text-gray-300 mb-4" />
        <p className="text-sm font-medium text-gray-500">新建实验记录</p>
        <p className="text-xs text-gray-400 mt-1">
          SciNote 创建表单 — 功能开发中
        </p>
      </div>
    </AppLayout>
  );
}
