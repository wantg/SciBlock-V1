import React from "react";
import { Bell, Send, Paperclip, Image as ImageIcon } from "lucide-react";
import { AppSidebar } from "./home/AppSidebar";

const RECENT_NOTES = [
  { id: 1, title: "Material characterization report", ago: "8 days ago" },
  { id: 2, title: "test", ago: "13 days ago" },
];

export function HomePage() {
  const [query, setQuery] = React.useState("");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AppSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-12 flex items-center justify-between px-6 border-b border-gray-100 bg-white flex-shrink-0">
          <span className="text-sm font-medium text-gray-700">主页</span>
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
              <Bell size={16} />
            </button>
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 select-none">
              U
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {/* Welcome */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            欢迎回来 👋
          </h1>

          {/* AI input card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 shadow-sm">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入内容以提问或搜索笔记..."
              rows={3}
              className="w-full resize-none text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                  <Paperclip size={15} />
                </button>
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                  <ImageIcon size={15} />
                </button>
              </div>
              <button
                disabled={!query.trim()}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  query.trim()
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed",
                ].join(" ")}
              >
                发送
                <Send size={12} />
              </button>
            </div>
          </div>

          {/* Recent notes */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.53" />
              </svg>
              <h2 className="text-sm font-medium text-gray-700">最近笔记</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              {RECENT_NOTES.map((note) => (
                <div
                  key={note.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium text-gray-800 mb-3 leading-snug">
                    {note.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {note.ago}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
