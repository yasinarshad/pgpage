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
};

export function ContentViewer({
  selectedRow, selectedSchema, selectedTable, fkLookups, headingComponents, onFilterClick,
}: ContentViewerProps) {
  const contentField = getContentField(selectedRow);
  const contentStr = contentField ? String(selectedRow[contentField]) : "";
  const words = useMemo(() => wordCount(contentStr), [contentStr]);
  const minutes = useMemo(() => readingTime(words), [words]);

  const clickable = "cursor-pointer hover:text-zinc-200 transition-colors";

  if (!contentField) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-6">
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
    <div className="max-w-4xl mx-auto px-8 py-6">
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
          <div className="flex flex-wrap gap-1 mt-2">
            {(selectedRow.tags as string[]).map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs ${onFilterClick ? "cursor-pointer hover:bg-zinc-700 hover:text-zinc-200 transition-colors" : ""}`}
                onClick={() => onFilterClick?.("tags", tag)}
                title={onFilterClick ? `Click to filter by "${tag}"` : undefined}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

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
