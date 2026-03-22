"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FeedEntry = {
  id: string;
  title: string;
  preview: string;
  tags: string[] | null;
  created_at: string;
  platform: string;
  schema_name: string;
  table_name: string;
};

const SCHEMA_COLORS: Record<string, string> = {
  memdb: "bg-blue-900/40 text-blue-300",
  sessiondb: "bg-green-900/40 text-green-300",
  worlddb: "bg-purple-900/40 text-purple-300",
  yasin_info: "bg-amber-900/40 text-amber-300",
};

export function MasterFeed({
  onNavigate,
}: {
  onNavigate: (schema: string, table: string, id: string) => void;
}) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("pg_master_feed", { row_limit: 50 });
      if (data) setEntries(data as FeedEntry[]);
      setLoading(false);
    }
    load();
  }, []);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("pg_master_feed", { row_limit: 50 });
    if (data) setEntries(data as FeedEntry[]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-zinc-100 mb-6">Recent Activity</h2>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="mb-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-3 w-full bg-zinc-800 rounded animate-pulse mb-1" />
            <div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Recent Activity</h2>
          <p className="text-xs text-zinc-500 mt-1">All entries across all databases</p>
        </div>
        <button
          onClick={refresh}
          className="text-zinc-500 hover:text-zinc-300 text-sm"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <div className="space-y-2">
        {entries.map((entry, i) => (
          <button
            key={`${entry.schema_name}-${entry.table_name}-${entry.id}-${i}`}
            onClick={() => onNavigate(entry.schema_name, entry.table_name, entry.id)}
            className="w-full text-left p-4 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SCHEMA_COLORS[entry.schema_name] || "bg-zinc-800 text-zinc-400"}`}>
                    {entry.table_name}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="text-sm text-zinc-200 font-medium truncate">
                  {entry.title || "Untitled"}
                </div>
                {entry.preview && (
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                    {entry.preview.replace(/[#*`_~\[\]]/g, "").slice(0, 150)}
                  </div>
                )}
              </div>
            </div>
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded text-[10px]">
                    {tag}
                  </span>
                ))}
                {entry.tags.length > 5 && (
                  <span className="text-[10px] text-zinc-600">+{entry.tags.length - 5}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
