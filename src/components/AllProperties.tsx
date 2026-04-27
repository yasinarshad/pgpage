"use client";

import { useMemo, useState } from "react";
import type { TableRow } from "@/lib/types";
import { getContentField } from "@/lib/helpers";

type AllPropertiesProps = {
  row: TableRow;
  fkLookups: Record<string, Record<string, string>>;
  isMobile?: boolean;
};

/** Columns shown elsewhere in ContentViewer — exclude from this panel. */
const ALWAYS_EXCLUDE = new Set<string>([
  // Header / title
  "id",
  "title",
  // Tags row
  "tags",
  // Properties bar
  "session_id",
  "platform",
  "topic",
  "created_at",
  "date_published",
  // Collapsible note sections
  "synthesis",
  "yasin_notes",
  "key_takeaways",
  "raw_notes",
  // Vector / search noise
  "embedding",
  "search_vector",
  "embedding_vector",
  // Master-feed-only field
  "preview",
]);

function formatValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="pgpage-null">NULL</span>;
  }
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      return <span className="pgpage-null">empty</span>;
    }
    // Long strings: show truncated by default with show-more
    if (value.length > 240) {
      return <LongString value={value} />;
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="pgpage-null">empty array</span>;
    return <span className="pgpage-mono">[{value.map((v) => JSON.stringify(v)).join(", ")}]</span>;
  }
  if (typeof value === "object") {
    return <span className="pgpage-mono">{JSON.stringify(value, null, 2)}</span>;
  }
  return String(value);
}

function LongString({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  if (expanded) {
    return (
      <>
        {value}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="pgpage-copy"
          style={{ opacity: 1, marginLeft: 8 }}
        >
          show less
        </button>
      </>
    );
  }
  return (
    <>
      {value.slice(0, 240)}…
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="pgpage-copy"
        style={{ opacity: 1, marginLeft: 8 }}
      >
        show more ({value.length - 240} more chars)
      </button>
    </>
  );
}

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

export function AllProperties({ row, fkLookups, isMobile }: AllPropertiesProps) {
  const fkColumns = useMemo(() => new Set(Object.keys(fkLookups)), [fkLookups]);
  const renderedContentField = getContentField(row);

  const entries = useMemo(() => {
    return Object.entries(row).filter(([key]) => {
      if (ALWAYS_EXCLUDE.has(key)) return false;
      if (fkColumns.has(key)) return false; // already shown in properties bar
      if (key === renderedContentField) return false; // shown as main content
      return true;
    });
  }, [row, fkColumns, renderedContentField]);

  if (entries.length === 0) return null;

  return (
    <details className="mt-4 pgpage-section-card">
      <summary
        className={`pgpage-section-summary ${isMobile ? "px-4 py-3" : "px-3.5 py-2.5"} text-sm font-medium select-none`}
        style={{ display: "block" }}
      >
        📋 All Properties ({entries.length})
      </summary>
      <div
        className="pgpage-section-body"
        style={{ borderTop: "1px solid var(--surface-border)" }}
      >
        <table className="pgpage-props-table">
          <tbody>
            {entries.map(([key, val]) => {
              const stringValue = (() => {
                if (val == null) return "";
                if (typeof val === "string") return val;
                if (typeof val === "number" || typeof val === "boolean") return String(val);
                try { return JSON.stringify(val); } catch { return ""; }
              })();
              return (
                <tr key={key}>
                  <td className="key">{key}</td>
                  <td className="val">
                    {formatValue(val)}
                    {stringValue && (
                      <button
                        type="button"
                        className="pgpage-copy"
                        onClick={() => copyToClipboard(stringValue)}
                        title="Copy value"
                      >
                        copy
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
