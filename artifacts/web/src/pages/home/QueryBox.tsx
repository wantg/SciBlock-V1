import React, { useState } from "react";
import { Send, Paperclip, Image as ImageIcon } from "lucide-react";

interface Props {
  onSubmit?: (query: string) => void;
}

export function QueryBox({ onSubmit }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 shadow-sm">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入内容以提问或搜索笔记..."
        rows={3}
        className="w-full resize-none text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            aria-label="Attach file"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Paperclip size={15} />
          </button>
          <button
            aria-label="Attach image"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ImageIcon size={15} />
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            value.trim()
              ? "bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          发送
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}
