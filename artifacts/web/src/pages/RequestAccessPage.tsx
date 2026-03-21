import React from "react";
import { useLocation } from "wouter";

export function RequestAccessPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <p className="mb-8 text-sm font-light tracking-[0.25em] text-gray-300 uppercase select-none">
        SCIBLOCK
      </p>

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl px-8 py-10 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500"
          >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-2">
          需邀请访问
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          SciBlock 目前处于内测阶段，账号由管理员统一创建，暂不支持公开注册。
        </p>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            如果您已获得访问权限，或希望申请试用，请联系您的管理员。
          </p>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="mt-7 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← 返回登录
        </button>
      </div>
    </div>
  );
}
