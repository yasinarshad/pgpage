"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Workspace } from "@/lib/workspaces";
import { WORKSPACES } from "@/lib/workspaces";
import type { TableRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

type SidebarProps = {
  user: User;
  setUser: (user: User | null) => void;
  tables: Record<string, string[]>;
  selectedSchema: string;
  setSelectedSchema: (s: string) => void;
  selectedTable: string | null;
  setSelectedTable: (t: string | null) => void;
  setSelectedRow: (r: TableRow | null) => void;
  setRows: (r: TableRow[]) => void;
  isMobileFullScreen?: boolean;
  activeWorkspace: Workspace;
  onSwitchWorkspace: (workspace: Workspace) => void;
};

export function Sidebar({
  user, setUser, tables, selectedSchema, setSelectedSchema,
  selectedTable, setSelectedTable, setSelectedRow, setRows,
  isMobileFullScreen,
  activeWorkspace, onSwitchWorkspace,
}: SidebarProps) {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <div className={`${isMobileFullScreen ? "w-full flex-1" : "w-56 flex-shrink-0"} border-r border-zinc-800 bg-zinc-900 overflow-y-auto flex flex-col`}>
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-zinc-100">pgpage</h1>
        <p className="text-xs text-zinc-500 mt-1">Postgres Markdown Viewer</p>
      </div>

      {/* Schema tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-zinc-800">
        {activeWorkspace.schemas.map((s) => (
          <button
            key={s.name}
            onClick={() => {
              setSelectedSchema(s.name);
              setSelectedTable(null);
              setSelectedRow(null);
              setRows([]);
            }}
            className={`px-2 py-1 rounded text-xs ${
              selectedSchema === s.name
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Tables list */}
      <div className="p-2 flex-1">
        {/* Recent Activity — virtual cross-schema table (only for workspaces with master feed) */}
        {activeWorkspace.hasMasterFeed && (
          <>
            <button
              onClick={() => setSelectedTable("__recent__")}
              className={`w-full text-left px-3 py-1.5 rounded text-sm mb-1 ${
                selectedTable === "__recent__"
                  ? "bg-blue-900/40 text-blue-300"
                  : "text-blue-400/70 hover:bg-zinc-800"
              }`}
            >
              Recent Activity
            </button>
            <div className="border-b border-zinc-800 mb-1" />
          </>
        )}
        {(tables[selectedSchema] || [])
          .filter((t) => !t.startsWith("directus_") && t !== "schema_changes")
          .map((table) => (
            <button
              key={table}
              onClick={() => setSelectedTable(table)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                selectedTable === table
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {table}
            </button>
          ))}
      </div>

      {/* Workspace switcher */}
      <div className="relative p-3 border-t border-zinc-800">
        <button
          onClick={() => setSwitcherOpen(!switcherOpen)}
          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors"
        >
          <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
            {activeWorkspace.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-zinc-300 truncate">{activeWorkspace.name}</div>
            <div className="text-[10px] text-zinc-600 truncate">{user?.email?.split("@")[0]}</div>
          </div>
          <svg className={`w-3 h-3 text-zinc-500 transition-transform ${switcherOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Dropdown popover (appears upward) */}
        {switcherOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {WORKSPACES.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    if (ws.id !== activeWorkspace.id) {
                      onSwitchWorkspace(ws);
                    }
                    setSwitcherOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 transition-colors"
                >
                  <div className="w-5 h-5 rounded bg-zinc-600 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                    {ws.name.charAt(0)}
                  </div>
                  <span className="text-xs text-zinc-300 flex-1">{ws.name}</span>
                  {ws.id === activeWorkspace.id && (
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
              <div className="border-t border-zinc-700" />
              <button
                onClick={() => {
                  const client = getSupabaseClient(activeWorkspace.supabaseUrl, activeWorkspace.anonKey);
                  client.auth.signOut();
                  setUser(null);
                  setSwitcherOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Sign out ({user?.email?.split("@")[0]})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
