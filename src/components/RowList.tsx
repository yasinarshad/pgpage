"use client";

import { useRef } from "react";
import type { TableRow, FilterRule, ColType } from "@/lib/types";
import type { SchemaName } from "@/lib/supabase";
import { getTitle, getCreatorName } from "@/lib/helpers";
import { FilterBuilder } from "./FilterBuilder";

type RowListProps = {
  selectedSchema: SchemaName;
  selectedTable: string;
  rows: TableRow[];
  sortedRows: TableRow[];
  filteredRowsCount: number;
  selectedRow: TableRow | null;
  setSelectedRow: (r: TableRow) => void;
  openTab: (r: TableRow) => void;
  loading: boolean;
  sortBy: "newest" | "oldest" | "modified" | "title";
  setSortBy: (s: "newest" | "oldest" | "modified" | "title") => void;
  searchInput: string;
  setSearchInput: (s: string) => void;
  isServerSearching: boolean;
  filterTag: string | null;
  setFilterTag: (t: string | null) => void;
  allTags: string[];
  filters: FilterRule[];
  setFilters: (f: FilterRule[]) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  columns: { name: string; type: ColType }[];
  columnValues: Record<string, string[]>;
  fkLookups: Record<string, Record<string, string>>;
  handleRefresh: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  selectedRowIndex: number;
  // Pagination
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  isMobileFullScreen?: boolean;
};

function LoadingSkeleton() {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-3 py-2 space-y-1.5">
          <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
          <div className="h-3 bg-zinc-800/60 rounded animate-pulse" style={{ width: `${30 + Math.random() * 20}%` }} />
        </div>
      ))}
    </div>
  );
}

export function RowList({
  selectedSchema, selectedTable, rows, sortedRows, filteredRowsCount,
  selectedRow, setSelectedRow, openTab, loading, sortBy, setSortBy,
  searchInput, setSearchInput, isServerSearching,
  filterTag, setFilterTag, allTags,
  filters, setFilters, showFilters, setShowFilters,
  columns, columnValues, fkLookups, handleRefresh, searchInputRef,
  selectedRowIndex,
  hasMore, loadingMore, onLoadMore,
  isMobileFullScreen,
}: RowListProps) {
  return (
    <div className={`${isMobileFullScreen ? "w-full" : "w-72 flex-shrink-0"} border-r border-zinc-800 bg-zinc-925 overflow-y-auto`}>
      <div className={`${isMobileFullScreen ? "p-4 sticky top-0 z-10 bg-zinc-925" : "p-3"} border-b border-zinc-800`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300">{selectedTable}</h2>
            <p className="text-xs text-zinc-500">
              {sortedRows.length}{filteredRowsCount !== rows.length ? ` / ${rows.length}` : ""} entries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
              title="Refresh"
            >
              ↻
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "modified" | "title")}
              className="bg-zinc-800 text-zinc-400 text-xs rounded px-2 py-1 border border-zinc-700 outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="modified">Last Modified</option>
              <option value="title">A-Z</option>
            </select>
          </div>
        </div>
        {/* Search */}
        <input
          ref={searchInputRef}
          type="text"
          placeholder={isServerSearching ? "Searching all rows..." : "Search (all rows)... \u2318K"}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={`w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border outline-none placeholder-zinc-500 mb-2 ${isServerSearching ? "border-blue-500" : "border-zinc-700"}`}
        />
        {/* Tag filter */}
        {allTags.length > 0 && (
          <div>
            {filterTag ? (
              <button
                onClick={() => setFilterTag(null)}
                className="px-2 py-0.5 rounded text-xs bg-blue-600 text-white"
              >
                {filterTag} ✕
              </button>
            ) : (
              <select
                value=""
                onChange={(e) => { if (e.target.value) setFilterTag(e.target.value); }}
                className="w-full bg-zinc-800 text-zinc-400 text-xs rounded px-2 py-1.5 border border-zinc-700 outline-none"
              >
                <option value="">Filter by tag ({allTags.length})</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {/* Advanced filters */}
        <FilterBuilder
          filters={filters}
          setFilters={setFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          columns={columns}
          columnValues={columnValues}
          fkLookups={fkLookups}
        />
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {sortedRows.map((row, idx) => {
            const creatorName = getCreatorName(row, fkLookups);
            return (
              <button
                key={row.id as number}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey) {
                    openTab(row);
                  } else {
                    setSelectedRow(row);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const path = `${selectedSchema}.${selectedTable}.id=${row.id}`;
                  navigator.clipboard.writeText(path);
                  const el = e.currentTarget;
                  el.style.outline = "1px solid #60a5fa";
                  setTimeout(() => { el.style.outline = ""; }, 500);
                }}
                title={`Right-click to copy: ${selectedSchema}.${selectedTable}.id=${row.id}`}
                className={`w-full text-left px-3 ${isMobileFullScreen ? "py-3" : "py-2"} border-b border-zinc-800/50 ${
                  selectedRow?.id === row.id
                    ? "bg-zinc-800"
                    : idx === selectedRowIndex
                    ? "bg-zinc-800/30"
                    : "hover:bg-zinc-800/50"
                }`}
              >
                <div className="text-sm text-zinc-200 truncate">
                  {getTitle(row, fkLookups)}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                  {creatorName && (
                    <>
                      <span className="text-zinc-400">{creatorName}</span>
                      <span className="text-zinc-700">&middot;</span>
                    </>
                  )}
                  <span>
                    {(row.date_published || row.created_at)
                      ? new Date(String(row.date_published || row.created_at)).toLocaleDateString()
                      : `#${row.id}`}
                  </span>
                </div>
              </button>
            );
          })}
          {hasMore && (
            <div className="p-3">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
