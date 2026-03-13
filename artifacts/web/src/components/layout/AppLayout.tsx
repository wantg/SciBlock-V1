import React from "react";
import { TopBar } from "./TopBar";

interface Props {
  title: string;
  children: React.ReactNode;
  /**
   * When true, removes the default padding and overflow-y-auto from the main
   * content area. Use for full-bleed layouts like the experiment workbench.
   */
  noPadding?: boolean;
}

/**
 * Standard page layout: top bar + scrollable content area.
 * Must be used inside AuthenticatedLayout (which supplies the sidebar).
 */
export function AppLayout({ title, children, noPadding = false }: Props) {
  return (
    <>
      <TopBar title={title} />
      <main
        className={
          noPadding
            ? "flex-1 min-h-0 flex flex-col overflow-hidden"
            : "flex-1 overflow-y-auto px-8 py-8 bg-gray-50"
        }
      >
        {children}
      </main>
    </>
  );
}
