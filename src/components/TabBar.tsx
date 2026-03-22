"use client";

import type { Tab } from "@/lib/types";

type TabBarProps = {
  openTabs: Tab[];
  activeTabId: string | number | null;
  switchTab: (tab: Tab) => void;
  closeTab: (tabId: string | number, tabSchema: string, tabTable: string, e?: React.MouseEvent) => void;
};

export function TabBar({ openTabs, activeTabId, switchTab, closeTab }: TabBarProps) {
  if (openTabs.length === 0) return null;

  return (
    <div className="flex-shrink-0 flex items-center border-b border-zinc-800 bg-zinc-900 overflow-x-auto">
      {openTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={`${tab.schema}-${tab.table}-${tab.id}`}
            onClick={() => switchTab(tab)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-zinc-800 whitespace-nowrap ${
              isActive
                ? "bg-zinc-950 text-zinc-100 border-b-2 border-b-blue-500"
                : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            <span className="max-w-[160px] truncate">{tab.title}</span>
            <span className="text-[10px] text-zinc-600">{tab.table}</span>
            <span
              onClick={(e) => closeTab(tab.id, tab.schema, tab.table, e)}
              className="ml-1 text-zinc-600 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              x
            </span>
          </button>
        );
      })}
    </div>
  );
}
