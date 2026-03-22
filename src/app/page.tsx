"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase, SCHEMAS, type SchemaName } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { TableRow, Tab, FilterRule } from "@/lib/types";
import {
  extractToc, slugify, getContentField, getTitle,
  parseHash, setHash, detectColType, applyFilter,
} from "@/lib/helpers";

import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar } from "@/components/Sidebar";
import { RowList } from "@/components/RowList";
import { ContentViewer } from "@/components/ContentViewer";
import { TOCSidebar } from "@/components/TOCSidebar";
import { TabBar } from "@/components/TabBar";
import { EmptyState } from "@/components/EmptyState";
import { HelpButton } from "@/components/HelpOverlay";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tables, setTables] = useState<Record<string, string[]>>({});
  const [selectedSchema, setSelectedSchema] = useState<SchemaName>("memdb");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "modified" | "title">("newest");
  const [initialized, setInitialized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRowList, setShowRowList] = useState(true);
  const [showToc, setShowToc] = useState(true);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isServerSearching, setIsServerSearching] = useState(false);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [fkLookups, setFkLookups] = useState<Record<string, Record<string, string>>>({});
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | number | null>(null);
  // Pagination state
  const [rowOffset, setRowOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Empty state stats
  const [dbStats, setDbStats] = useState<{ schemas: number; tables: number; rows: number } | null>(null);
  // Keyboard navigation
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check existing auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load tables for each schema + compute stats for empty state
  useEffect(() => {
    async function loadTables() {
      const result: Record<string, string[]> = {};
      let totalTables = 0;
      let schemaCount = 0;
      for (const schema of SCHEMAS) {
        const { data } = await supabase.rpc("pg_tables_list", {
          p_schema: schema.name,
        });
        if (data) {
          const filtered = (data as string[]).filter(
            (t: string) => !t.startsWith("directus_") && t !== "schema_changes"
          );
          result[schema.name] = data as string[];
          totalTables += filtered.length;
          if (filtered.length > 0) schemaCount++;
        }
      }
      setTables(result);

      // Compute row count stats in background (don't block table loading)
      setDbStats({ schemas: schemaCount, tables: totalTables, rows: 0 });
      let rowCount = 0;
      for (const schema of SCHEMAS) {
        const filtered = (result[schema.name] || []).filter(
          (t: string) => !t.startsWith("directus_") && t !== "schema_changes"
        );
        for (const table of filtered) {
          const { data: rowData } = await supabase.rpc("pg_query_table", {
            p_schema: schema.name,
            p_table: table,
            row_limit: 500,
          });
          if (rowData && Array.isArray(rowData)) rowCount += rowData.length;
        }
      }
      setDbStats({ schemas: schemaCount, tables: totalTables, rows: rowCount });

      // Restore state from URL hash after tables are loaded
      const { schema, table, id } = parseHash();
      if (schema && SCHEMAS.some((s) => s.name === schema)) {
        setSelectedSchema(schema);
        if (table) {
          setSelectedTable(table);
          if (id) {
            const { data } = await supabase.rpc("pg_query_table", {
              p_schema: schema,
              p_table: table,
              row_limit: 100,
            });
            if (data) {
              setRows(data as TableRow[]);
              setHasMore((data as TableRow[]).length === 100);
              setRowOffset(100);
              const match = (data as TableRow[]).find((r) => String(r.id) === String(id));
              if (match) {
                setSelectedRow(match);
                const tabId = match.id as string | number;
                setOpenTabs([{ schema, table, row: match, id: tabId, title: getTitle(match, fkLookups) }]);
                setActiveTabId(tabId);
              }
            }
          }
        }
      }
      setInitialized(true);
    }
    loadTables();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for hash changes
  useEffect(() => {
    function handleHashChange() {
      const { schema, table, id } = parseHash();
      if (schema && SCHEMAS.some((s) => s.name === schema)) {
        setSelectedSchema(schema);
        if (table) {
          setSelectedTable(table);
          if (id) {
            supabase.rpc("pg_query_table", {
              p_schema: schema,
              p_table: table,
              row_limit: 100,
            }).then(({ data }) => {
              if (data) {
                setRows(data as TableRow[]);
                setHasMore((data as TableRow[]).length === 100);
                setRowOffset(100);
                const match = (data as TableRow[]).find((r) => r.id === id);
                if (match) setSelectedRow(match);
              }
            });
          }
        }
      }
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Load rows when table is selected
  const loadRows = useCallback(async (schema: SchemaName, table: string) => {
    setLoading(true);
    setRowOffset(0);
    const { data, error } = await supabase.rpc("pg_query_table", {
      p_schema: schema,
      p_table: table,
      row_limit: 100,
    });
    if (!error && data) {
      setRows(data as TableRow[]);
      setHasMore((data as TableRow[]).length === 100);
      setRowOffset(100);
      const { id } = parseHash();
      if (id) {
        const match = (data as TableRow[]).find((r) => r.id === id);
        if (match) setSelectedRow(match);
      }
    }
    setLoading(false);
  }, []);

  // Load more rows (pagination)
  const handleLoadMore = useCallback(async () => {
    if (!selectedTable || loadingMore) return;
    setLoadingMore(true);
    const { data, error } = await supabase.rpc("pg_query_table", {
      p_schema: selectedSchema,
      p_table: selectedTable,
      row_limit: 100,
      row_offset: rowOffset,
    });
    if (!error && data) {
      const newRows = data as TableRow[];
      // Deduplicate: only add rows we don't already have
      setRows((prev) => {
        const existingIds = new Set(prev.map((r) => String(r.id)));
        const unique = newRows.filter((r) => !existingIds.has(String(r.id)));
        if (unique.length === 0) {
          // No new rows — RPC may not support offset
          setHasMore(false);
          return prev;
        }
        setHasMore(newRows.length === 100);
        return [...prev, ...unique];
      });
      setRowOffset((prev) => prev + newRows.length);
    }
    setLoadingMore(false);
  }, [selectedSchema, selectedTable, rowOffset, loadingMore]);

  useEffect(() => {
    if (!selectedTable) return;
    setSelectedRow(null);
    setSearchInput("");
    setSearchQuery("");
    setFilters([]);
    setFilterTag(null);
    setFkLookups({});
    setSelectedRowIndex(-1);
    loadRows(selectedSchema, selectedTable);
    supabase.rpc("pg_resolve_fks", { p_schema: selectedSchema, p_table: selectedTable })
      .then(({ data }) => { if (data) setFkLookups(data as Record<string, Record<string, string>>); });
  }, [selectedSchema, selectedTable, loadRows]);

  // Debounced server-side search
  useEffect(() => {
    if (!selectedTable || !searchInput) {
      if (!searchInput && searchQuery) setSearchQuery("");
      return;
    }
    const timer = setTimeout(async () => {
      setIsServerSearching(true);
      const { data } = await supabase.rpc("pg_search_table", {
        p_schema: selectedSchema,
        p_table: selectedTable,
        query: searchInput,
        row_limit: 200,
      });
      if (data) {
        setRows(data as TableRow[]);
        setSearchQuery(searchInput);
        setHasMore(false); // search results don't paginate
      }
      setIsServerSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, selectedSchema, selectedTable]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload original rows when search is cleared
  useEffect(() => {
    if (searchInput === "" && selectedTable && !loading) {
      loadRows(selectedSchema, selectedTable);
    }
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL hash when selection changes
  useEffect(() => {
    if (!initialized) return;
    setHash(
      selectedSchema,
      selectedTable || undefined,
      selectedRow?.id != null ? (selectedRow.id as number) : undefined
    );
  }, [selectedSchema, selectedTable, selectedRow, initialized]);

  // Keyboard shortcuts: Cmd+K, Escape, Up/Down arrows
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K or Ctrl+K: focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Escape: deselect row / blur search
      if (e.key === "Escape") {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
          setSearchInput("");
        } else if (selectedRow) {
          setSelectedRow(null);
          setSelectedRowIndex(-1);
        }
        return;
      }

      // Up/Down arrows: navigate row list (only when not in an input/textarea)
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedRowIndex((prev) => {
          const max = sortedRows.length - 1;
          if (max < 0) return -1;
          let next: number;
          if (e.key === "ArrowDown") {
            next = prev < max ? prev + 1 : max;
          } else {
            next = prev > 0 ? prev - 1 : 0;
          }
          // Select the row
          const row = sortedRows[next];
          if (row) setSelectedRow(row);
          return next;
        });
      }

      // Enter: open selected row as tab
      if (e.key === "Enter" && selectedRowIndex >= 0) {
        const row = sortedRows[selectedRowIndex];
        if (row) openTab(row);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }); // Re-bind on every render so closures have fresh state

  // Collect all unique tags from current rows
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    rows.forEach((row) => {
      if (Array.isArray(row.tags)) {
        (row.tags as string[]).forEach((t) => tagSet.add(t));
      }
    });
    return [...tagSet].sort();
  }, [rows]);

  // Detect column names and types from first row
  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    const firstRow = rows[0];
    const skip = ["embedding", "search_vector"];
    return Object.keys(firstRow)
      .filter((k) => !skip.includes(k))
      .map((k) => ({ name: k, type: detectColType(firstRow[k]) }));
  }, [rows]);

  // Collect unique values per column
  const columnValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    const longTextCols = new Set<string>();
    for (const row of rows) {
      for (const [k, v] of Object.entries(row)) {
        if (v == null || k === "embedding" || k === "search_vector") continue;
        if (typeof v === "string" && v.length > 200) { longTextCols.add(k); continue; }
        if (!result[k]) result[k] = [];
        if (Array.isArray(v)) {
          for (const item of v) {
            const s = String(item);
            if (!result[k].includes(s)) result[k].push(s);
          }
        } else {
          const s = String(v);
          if (!result[k].includes(s)) result[k].push(s);
        }
      }
    }
    for (const k of longTextCols) delete result[k];
    for (const k of Object.keys(result)) {
      if (result[k].length > 200) delete result[k];
      else result[k].sort();
    }
    return result;
  }, [rows]);

  // Filter then sort
  const filteredRows = rows.filter((row) => {
    if (filterTag && !(Array.isArray(row.tags) && (row.tags as string[]).includes(filterTag))) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const id = String(row.id || "");
      if (q === id) return true;
      const title = String(row.title || "").toLowerCase();
      const content = String(row.content || row.summary || row.decision || row.description || "").toLowerCase();
      const tags = Array.isArray(row.tags) ? (row.tags as string[]).join(" ").toLowerCase() : "";
      if (!title.includes(q) && !content.includes(q) && !tags.includes(q)) return false;
    }
    for (const f of filters) {
      if (f.column && f.operator && !applyFilter(row, f)) return false;
    }
    return true;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortBy === "title") {
      return String(a.title || "").localeCompare(String(b.title || ""));
    }
    if (sortBy === "modified") {
      const modA = String(a.updated_at || a.created_at || 0);
      const modB = String(b.updated_at || b.created_at || 0);
      return modB.localeCompare(modA);
    }
    const dateA = String(a.created_at || a.id || 0);
    const dateB = String(b.created_at || b.id || 0);
    return sortBy === "newest" ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
  });

  const contentField = selectedRow ? getContentField(selectedRow) : null;
  const contentStr = selectedRow && contentField ? String(selectedRow[contentField]) : "";
  const toc = useMemo(() => extractToc(contentStr), [contentStr]);

  // Custom heading renderer that adds id for TOC linking
  const headingComponents = useMemo(() => ({
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      return <h1 id={slugify(text)} {...props}>{children}</h1>;
    },
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      return <h2 id={slugify(text)} {...props}>{children}</h2>;
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      return <h3 id={slugify(text)} {...props}>{children}</h3>;
    },
    h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      return <h4 id={slugify(text)} {...props}>{children}</h4>;
    },
  }), []);

  // Refresh current table
  const handleRefresh = () => {
    if (selectedTable) {
      loadRows(selectedSchema, selectedTable);
    }
  };

  // Tab management
  const openTab = (row: TableRow) => {
    const id = row.id as number;
    const existing = openTabs.find((t) => t.id === id && t.schema === selectedSchema && t.table === selectedTable);
    if (existing) {
      setActiveTabId(id);
    } else {
      const tab: Tab = {
        schema: selectedSchema,
        table: selectedTable!,
        row,
        id,
        title: getTitle(row, fkLookups),
      };
      setOpenTabs((prev) => [...prev, tab]);
      setActiveTabId(id);
    }
    setSelectedRow(row);
  };

  const closeTab = (tabId: string | number, tabSchema: string, tabTable: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newTabs = openTabs.filter((t) => !(t.id === tabId && t.schema === tabSchema && t.table === tabTable));
    setOpenTabs(newTabs);
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const last = newTabs[newTabs.length - 1];
        setActiveTabId(last.id);
        setSelectedRow(last.row);
      } else {
        setActiveTabId(null);
        setSelectedRow(null);
      }
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTabId(tab.id);
    setSelectedRow(tab.row);
    setSelectedSchema(tab.schema);
    setSelectedTable(tab.table);
  };

  const activeTab = openTabs.find((t) => t.id === activeTabId && t.schema === selectedSchema && t.table === selectedTable)
    || openTabs.find((t) => t.id === activeTabId);

  if (authLoading) {
    // Loading skeleton for auth check
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="w-80 p-6 space-y-4">
          <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-40 bg-zinc-800/60 rounded animate-pulse" />
          <div className="h-10 bg-zinc-800 rounded animate-pulse" />
          <div className="h-10 bg-zinc-800 rounded animate-pulse" />
          <div className="h-10 bg-zinc-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return (
    <div className="flex h-screen">
      {/* Panel toggle bar */}
      <div className="flex-shrink-0 w-10 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center pt-3 gap-2">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={`w-7 h-7 rounded flex items-center justify-center text-xs ${showSidebar ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800"}`}
          title="Toggle schemas/tables"
        >
          ☰
        </button>
        <button
          onClick={() => setShowRowList(!showRowList)}
          className={`w-7 h-7 rounded flex items-center justify-center text-xs ${showRowList ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800"}`}
          title="Toggle row list"
        >
          ≡
        </button>
        <button
          onClick={() => setShowToc(!showToc)}
          className={`w-7 h-7 rounded flex items-center justify-center text-xs ${showToc ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800"}`}
          title="Toggle table of contents"
        >
          ¶
        </button>
        <div className="flex-1" />
        <div className="mb-3">
          <HelpButton />
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          user={user}
          setUser={setUser}
          tables={tables}
          selectedSchema={selectedSchema}
          setSelectedSchema={setSelectedSchema}
          selectedTable={selectedTable}
          setSelectedTable={setSelectedTable}
          setSelectedRow={setSelectedRow}
          setRows={setRows}
        />
      )}

      {/* Row list */}
      {showRowList && selectedTable && (
        <RowList
          selectedSchema={selectedSchema}
          selectedTable={selectedTable}
          rows={rows}
          sortedRows={sortedRows}
          filteredRowsCount={filteredRows.length}
          selectedRow={selectedRow}
          setSelectedRow={setSelectedRow}
          openTab={openTab}
          loading={loading}
          sortBy={sortBy}
          setSortBy={setSortBy}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          isServerSearching={isServerSearching}
          filterTag={filterTag}
          setFilterTag={setFilterTag}
          allTags={allTags}
          filters={filters}
          setFilters={setFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          columns={columns}
          columnValues={columnValues}
          fkLookups={fkLookups}
          handleRefresh={handleRefresh}
          searchInputRef={searchInputRef}
          selectedRowIndex={selectedRowIndex}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
        />
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <TabBar
          openTabs={openTabs}
          activeTabId={activeTabId}
          switchTab={switchTab}
          closeTab={closeTab}
        />

        <div className="flex-1 overflow-y-auto">
          {selectedRow ? (
            <ContentViewer
              selectedRow={selectedRow}
              selectedSchema={selectedSchema}
              selectedTable={selectedTable || ""}
              fkLookups={fkLookups}
              headingComponents={headingComponents}
              onFilterClick={(column, value) => {
                if (column === "tags") {
                  setFilterTag(value);
                } else {
                  setFilters([{ column, operator: "equals", value }]);
                  setShowFilters(true);
                }
              }}
            />
          ) : (
            <EmptyState stats={dbStats} />
          )}
        </div>
      </div>

      {/* TOC sidebar */}
      {showToc && selectedRow && contentField && toc.length > 0 && (
        <TOCSidebar toc={toc} />
      )}
    </div>
  );
}
