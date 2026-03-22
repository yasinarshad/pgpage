"use client";

import { supabase, SCHEMAS, type SchemaName } from "@/lib/supabase";
import type { TableRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

type SidebarProps = {
  user: User;
  setUser: (user: User | null) => void;
  tables: Record<string, string[]>;
  selectedSchema: SchemaName;
  setSelectedSchema: (s: SchemaName) => void;
  selectedTable: string | null;
  setSelectedTable: (t: string | null) => void;
  setSelectedRow: (r: TableRow | null) => void;
  setRows: (r: TableRow[]) => void;
  isMobileFullScreen?: boolean;
};

export function Sidebar({
  user, setUser, tables, selectedSchema, setSelectedSchema,
  selectedTable, setSelectedTable, setSelectedRow, setRows,
  isMobileFullScreen,
}: SidebarProps) {
  return (
    <div className={`${isMobileFullScreen ? "w-full flex-1" : "w-56 flex-shrink-0"} border-r border-zinc-800 bg-zinc-900 overflow-y-auto flex flex-col`}>
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-zinc-100">pgpage</h1>
        <p className="text-xs text-zinc-500 mt-1">Postgres Markdown Viewer</p>
      </div>

      {/* Schema tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-zinc-800">
        {SCHEMAS.map((s) => (
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

      {/* Logout */}
      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={() => { supabase.auth.signOut(); setUser(null); }}
          className="w-full text-left text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1"
        >
          Sign out ({user?.email?.split("@")[0]})
        </button>
      </div>
    </div>
  );
}
