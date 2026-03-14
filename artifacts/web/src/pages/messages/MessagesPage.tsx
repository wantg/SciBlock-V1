/**
 * MessagesPage — 消息中心页面
 *
 * Layer: page (composes layout, reads from MessagesContext)
 *
 * 布局:
 *   [TopBar: 消息]
 *   ┌──────────────────────┬──────────────────────────────────────────┐
 *   │ MessageList  (300px) │ MessageDetail (flex-1)                   │
 *   └──────────────────────┴──────────────────────────────────────────┘
 */

import React from "react";
import { TopBar } from "../../components/layout/TopBar";
import { MessageList } from "./MessageList";
import { MessageDetail } from "./MessageDetail";

export function MessagesPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="消息" />

      <div className="flex flex-1 min-h-0">
        {/* Left: message list */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 bg-white overflow-hidden">
          <MessageList />
        </div>

        {/* Right: message detail */}
        <div className="flex-1 bg-white overflow-hidden">
          <MessageDetail />
        </div>
      </div>
    </div>
  );
}
