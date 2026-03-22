"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { TableRow } from "@/lib/types";
import type { SchemaName } from "@/lib/supabase";
import { getContentField, getTitle, slugify, wordCount, readingTime } from "@/lib/helpers";

type ContentViewerProps = {
  selectedRow: TableRow;
  selectedSchema: SchemaName;
  selectedTable: string;
  fkLookups: Record<string, Record<string, string>>;
  headingComponents: Record<string, React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>>;
  onFilterClick?: (column: string, value: string) => void;
  isMobile?: boolean;
};

export function ContentViewer({
  selectedRow, selectedSchema, selectedTable, fkLookups, headingComponents, onFilterClick, isMobile,
}: ContentViewerProps) {
  const contentField = getContentField(selectedRow);
  const contentStr = contentField ? String(selectedRow[contentField]) : "";
  const words = useMemo(() => wordCount(contentStr), [contentStr]);
  const minutes = useMemo(() => readingTime(words), [words]);

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
                const url = `${window.location.origin}${window.location.pathname}#${selectedSchema}/${selectedTable}/${selectedRow.id}`;
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
                <div className="mt-2 pl-4 border-l-2 border-zinc-700 text-sm text-zinc-400">
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
    </div>
  );
}
