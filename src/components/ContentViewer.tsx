"use client";

import { useMemo, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TableRow } from "@/lib/types";
import { getContentField, getTitle, slugify, wordCount, readingTime } from "@/lib/helpers";

type Connection = {
  id: number;
  source_type: string;
  source_id: number;
  target_type: string;
  target_id: number;
  relationship: string;
  note: string | null;
  confidence: number | null;
  target_schema: string | null;
  target_title?: string;
};

type ContentViewerProps = {
  selectedRow: TableRow;
  selectedSchema: string;
  selectedTable: string;
  fkLookups: Record<string, Record<string, string>>;
  headingComponents: Record<string, React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>>;
  onFilterClick?: (column: string, value: string) => void;
  isMobile?: boolean;
  workspaceId?: string;
  supabase?: SupabaseClient;
};

export function ContentViewer({
  selectedRow, selectedSchema, selectedTable, fkLookups, headingComponents, onFilterClick, isMobile, workspaceId, supabase,
}: ContentViewerProps) {
  const contentField = getContentField(selectedRow);
  const contentStr = contentField ? String(selectedRow[contentField]) : "";
  const words = useMemo(() => wordCount(contentStr), [contentStr]);
  const minutes = useMemo(() => readingTime(words), [words]);

  // Fetch connections for this row
  const [connections, setConnections] = useState<Connection[]>([]);
  useEffect(() => {
    if (!supabase || selectedRow.id == null) { setConnections([]); return; }
    const rowId = Number(selectedRow.id);
    if (isNaN(rowId)) { setConnections([]); return; }

    // Query connections table where this row is either source or target
    supabase
      .schema("memdb")
      .from("memdb_connections")
      .select("id,source_type,source_id,target_type,target_id,relationship,note,confidence,target_schema")
      .or(`and(source_type.eq.${selectedTable},source_id.eq.${rowId}),and(target_type.eq.${selectedTable},target_id.eq.${rowId})`)
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setConnections([]); return; }

        // Normalize: make "the other side" always the target from this row's perspective
        const normalized: Connection[] = (data as Connection[]).map((c) => {
          if (c.target_type === selectedTable && c.target_id === rowId) {
            // This row is the target — flip to show the source as the connected entry
            return { ...c, target_type: c.source_type, target_id: c.source_id, source_type: c.target_type, source_id: c.target_id };
          }
          return c;
        });

        // Fetch titles for connected entries
        const titlePromises = normalized.map(async (conn) => {
          const schema = conn.target_schema || "memdb";
          const { data: row } = await supabase.rpc("pg_get_row", {
            p_schema: schema,
            p_table: conn.target_type,
            row_id: String(conn.target_id),
          });
          const title = row ? (String((row as TableRow).title || (row as TableRow).database_title || (row as TableRow).name || (row as TableRow).category || `#${conn.target_id}`)) : `#${conn.target_id}`;
          return { ...conn, target_title: title };
        });

        const withTitles = await Promise.all(titlePromises);
        setConnections(withTitles);
      });
  }, [supabase, selectedRow.id, selectedTable]); // eslint-disable-line react-hooks/exhaustive-deps

  const clickable = "cursor-pointer hover:text-zinc-200 transition-colors";

  const containerClass = isMobile
    ? "px-4 py-4"
    : "max-w-4xl mx-auto px-8 py-6";

  if (!contentField) {
    return (
      <div className={containerClass}>
        <h2 className="text-lg font-semibold mb-4">
          {getTitle(selectedRow, fkLookups)}
        </h2>
        <pre className="text-sm text-zinc-400 whitespace-pre-wrap">
          {JSON.stringify(selectedRow, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Breadcrumb bar */}
      <div className="mb-2">
        <div className="text-xs text-zinc-500 flex items-center gap-1">
          <span className="text-zinc-400">{selectedSchema}</span>
          <span className="text-zinc-600">&rsaquo;</span>
          <span className="text-zinc-400">{selectedTable}</span>
          <span className="text-zinc-600">&rsaquo;</span>
          <span className="text-zinc-300">#{String(selectedRow.id)}</span>
        </div>
        {words > 0 && (
          <p className="text-[11px] text-zinc-600 mt-0.5">
            {words.toLocaleString()} words &middot; {minutes} min read
          </p>
        )}
      </div>

      {/* Properties bar */}
      <div className="mb-6 pb-4 border-b border-zinc-800">
        {Boolean(selectedRow.title) && (
          <h1 className="text-2xl font-bold text-zinc-100 mb-3">
            {String(selectedRow.title)}
          </h1>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
          {selectedRow.id != null && (
            <span
              className="cursor-pointer hover:text-zinc-300"
              onClick={() => {
                const hashPath = workspaceId
                  ? `${workspaceId}/${selectedSchema}/${selectedTable}/${selectedRow.id}`
                  : `${selectedSchema}/${selectedTable}/${selectedRow.id}`;
                const url = `${window.location.origin}${window.location.pathname}#${hashPath}`;
                navigator.clipboard.writeText(url);
              }}
              title="Click to copy URL"
            >
              {selectedSchema}/{selectedTable}/{String(selectedRow.id)}
            </span>
          )}
          {Boolean(selectedRow.date_published) && (
            <span>
              Published:{" "}
              {new Date(String(selectedRow.date_published)).toLocaleDateString()}
            </span>
          )}
          {Boolean(selectedRow.created_at) && (
            <span>
              Added:{" "}
              {new Date(String(selectedRow.created_at)).toLocaleString()}
            </span>
          )}
          {Boolean(selectedRow.session_id) && String(selectedRow.session_id) !== "00000000-0000-0000-0000-000000000000" && (
            <span
              className={onFilterClick ? clickable : ""}
              onClick={() => onFilterClick?.("session_id", String(selectedRow.session_id))}
              title={onFilterClick ? "Click to see all entries from this session" : undefined}
            >
              Session: {String(selectedRow.session_id).slice(0, 8)}...
            </span>
          )}
          {Boolean(selectedRow.platform) && (
            <span
              className={onFilterClick ? clickable : ""}
              onClick={() => onFilterClick?.("platform", String(selectedRow.platform))}
              title={onFilterClick ? "Click to filter by this platform" : undefined}
            >
              Platform: {String(selectedRow.platform)}
            </span>
          )}
          {Boolean(selectedRow.topic) && (
            <span
              className={onFilterClick ? clickable : ""}
              onClick={() => onFilterClick?.("topic", String(selectedRow.topic))}
              title={onFilterClick ? "Click to filter by this topic" : undefined}
            >
              Topic: {String(selectedRow.topic)}
            </span>
          )}
          {Object.entries(fkLookups).map(([col, lookup]) => {
            const val = String(selectedRow[col] ?? "");
            if (!lookup[val]) return null;
            return (
              <span
                key={col}
                className={onFilterClick ? clickable : ""}
                onClick={() => onFilterClick?.(col, val)}
                title={onFilterClick ? `Click to filter by ${lookup[val]}` : undefined}
              >
                {col.replace(/_id$/, "")}: {lookup[val]}
              </span>
            );
          })}
        </div>
        {Array.isArray(selectedRow.tags) && (
          <div className={`flex flex-wrap ${isMobile ? "gap-2" : "gap-1"} mt-2`}>
            {(selectedRow.tags as string[]).map((tag) => (
              <span
                key={tag}
                className={`${isMobile ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs"} bg-zinc-800 text-zinc-400 rounded ${onFilterClick ? "cursor-pointer hover:bg-zinc-700 hover:text-zinc-200 transition-colors" : ""}`}
                onClick={() => onFilterClick?.("tags", tag)}
                title={onFilterClick ? `Click to filter by "${tag}"` : undefined}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible note sections */}
      {(() => {
        const noteSections = [
          { key: "synthesis", label: "🧠 Synthesis", openByDefault: true },
          { key: "yasin_notes", label: "📝 Yasin's Notes", openByDefault: true },
          { key: "key_takeaways", label: "💡 Key Takeaways", openByDefault: false },
          { key: "raw_notes", label: "📋 Raw Notes", openByDefault: false },
        ].filter(({ key }) => {
          const val = selectedRow[key];
          return val && typeof val === "string" && (val as string).trim().length > 0;
        });
        if (noteSections.length === 0) return null;
        return (
          <div className="mb-6 space-y-2">
            {noteSections.map(({ key, label, openByDefault }) => (
              <details key={key} className="mb-3" open={openByDefault || undefined}>
                <summary className="text-sm font-medium text-zinc-300 cursor-pointer hover:text-zinc-100">
                  {label}
                </summary>
                <div className="mt-2 pl-4 border-l-2 border-zinc-700 text-sm text-zinc-400 pgpage-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {String(selectedRow[key])}
                  </ReactMarkdown>
                </div>
              </details>
            ))}
          </div>
        );
      })()}

      {/* Rendered markdown */}
      <div className="pgpage-prose">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={headingComponents}
        >
          {contentStr}
        </ReactMarkdown>
      </div>

      {/* Connected Threads */}
      {connections.length > 0 && (
        <div className="mt-8 pt-6 border-t border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <span>🔗</span> Connected Threads
          </h3>
          <div className="space-y-3">
            {connections.map((conn) => {
              const schema = conn.target_schema || "memdb";
              const typePrefix: Record<string, string> = {
                journals: "J", learnings: "L", decisions: "D", signals: "S",
                business_plans: "BP", yasin_transcripts: "YT", content_mining: "CM",
                content_favs: "CF", thoughts: "T", experiments: "EX", project_ideas: "PI",
              };
              const prefix = typePrefix[conn.target_type] || conn.target_type.toUpperCase().slice(0, 2);
              const url = workspaceId
                ? `#${workspaceId}/${schema}/${conn.target_type}/${conn.target_id}`
                : `#${schema}/${conn.target_type}/${conn.target_id}`;

              return (
                <a
                  key={`${conn.target_type}-${conn.target_id}`}
                  href={url}
                  className="block p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-zinc-500 mt-0.5 shrink-0">
                      {prefix}{conn.target_id}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm text-zinc-200 font-medium">
                        {conn.target_title}
                      </span>
                      <span className="ml-2 text-xs text-zinc-600">
                        {conn.relationship.replace(/_/g, " ")}
                      </span>
                      {conn.note && (
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                          {conn.note}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
