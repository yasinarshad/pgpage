"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase, SCHEMAS, loadTableConfig, type SchemaName, type TableConfig } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { TableRow, Tab, FilterRule } from "@/lib/types";
import {
  extractToc, slugify, getContentField, getTitle,
  parseHash, setHash, detectColType, applyFilter,
} from "@/lib/helpers";
import { useMobileView } from "@/lib/useMobile";

import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar } from "@/components/Sidebar";
import { RowList } from "@/components/RowList";
import { ContentViewer } from "@/components/ContentViewer";
import { TOCSidebar } from "@/components/TOCSidebar";
import { TabBar } from "@/components/TabBar";
import { EmptyState } from "@/components/EmptyState";
import { MasterFeed } from "@/components/MasterFeed";
import { HelpButton } from "@/components/HelpOverlay";
import { BottomNav } from "@/components/BottomNav";
import { MobileBackHeader } from "@/components/MobileBackHeader";

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
  // Table config (date column overrides per table)
  const [tableConfig, setTableConfig] = useState<TableConfig>({});

  // Mobile state
  const { mobileView, pushTo, goBack, isPhone, isTablet, isDesktop } = useMobileView();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

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

  // On mount: restore hash URL immediately (parallel with table loading)
  useEffect(() => {
    const { schema, table, id } = parseHash();

    // If we have a direct link, fetch the row IMMEDIATELY — don't wait for tables
    if (schema && table && id && SCHEMAS.some((s) => s.name === schema)) {
      setSelectedSchema(schema);
      setSelectedTable(table);
      supabase.rpc("pg_query_table", {
        p_schema: schema,
        p_table: table,
        row_limit: 100,
      }).then(({ data }) => {
        if (data) {
          setRows(data as TableRow[]);
          setHasMore((data as TableRow[]).length === 100);
          setRowOffset(100);
          const match = (data as TableRow[]).find((r) => String(r.id) === String(id));
          if (match) {
            setSelectedRow(match);
            const tabId = match.id as string | number;
            setOpenTabs([{ schema, table, row: match, id: tabId, title: getTitle(match) }]);
            setActiveTabId(tabId);
            // On mobile, jump straight to content view for direct links
            if (!isDesktop) pushTo("content");
          }
        }
      });
      // Also load FK lookups for this table
      supabase.rpc("pg_resolve_fks", { p_schema: schema, p_table: table })
        .then(({ data }) => { if (data) setFkLookups(data as Record<string, Record<string, string>>); });
    } else if (schema && SCHEMAS.some((s) => s.name === schema)) {
      setSelectedSchema(schema);
      if (table) setSelectedTable(table);
    }

    // Load table lists in parallel (for sidebar)
    async function loadTables() {
      const result: Record<string, string[]> = {};
      let totalTables = 0;
      let schemaCount = 0;
      // Fetch all schemas in parallel
      const promises = SCHEMAS.map((s) =>
        supabase.rpc("pg_tables_list", { p_schema: s.name }).then(({ data }) => ({ name: s.name, data }))
      );
      const results = await Promise.all(promises);
      for (const { name, data } of results) {
        if (data) {
          const filtered = (data as string[]).filter(
            (t: string) => !t.startsWith("directus_") && t !== "schema_changes"
          );
          result[name] = data as string[];
          totalTables += filtered.length;
          if (filtered.length > 0) schemaCount++;
        }
      }
      setTables(result);
      setDbStats({ schemas: schemaCount, tables: totalTables, rows: 0 });
      setInitialized(true);
    }
    loadTables();
    loadTableConfig().then(setTableConfig);
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

    if (selectedTable === "__recent__") {
      // Load master feed instead of a regular table
      setLoading(true);
      supabase.rpc("pg_master_feed", { row_limit: 100 })
        .then(({ data }) => {
          if (data) setRows(data as TableRow[]);
          setLoading(false);
        });
      return;
    }

    loadRows(selectedSchema, selectedTable);
    supabase.rpc("pg_resolve_fks", { p_schema: selectedSchema, p_table: selectedTable })
      .then(({ data }) => { if (data) setFkLookups(data as Record<string, Record<string, string>>); });
  }, [selectedSchema, selectedTable, loadRows]);

  // Debounced server-side search
  useEffect(() => {
    if (!selectedTable || !searchInput || selectedTable === "__recent__") {
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
    if (searchInput === "" && selectedTable && selectedTable !== "__recent__" && !loading) {
      loadRows(selectedSchema, selectedTable);
    }
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL hash when selection changes (skip for __recent__ — openTab sets the correct hash)
  useEffect(() => {
    if (!initialized) return;
    if (selectedTable === "__recent__") return;
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

  // Resolve the configured date column for the current table
  const getDateValue = (row: TableRow) => {
    const key = `${selectedSchema}.${selectedTable}`;
    const col = tableConfig[key]?.dateColumn;
    return col && row[col] ? String(row[col]) : String(row.created_at || row.id || 0);
  };

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortBy === "title") {
      return String(a.title || "").localeCompare(String(b.title || ""));
    }
    if (sortBy === "modified") {
      const modA = String(a.updated_at || a.created_at || 0);
      const modB = String(b.updated_at || b.created_at || 0);
      return modB.localeCompare(modA);
    }
    const dateA = getDateValue(a);
    const dateB = getDateValue(b);
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

  // When viewing from Recent Activity, derive schema/table from the selected row itself
  const viewSchema = (selectedTable === "__recent__" && selectedRow?.schema_name)
    ? String(selectedRow.schema_name) as SchemaName
    : selectedSchema;
  const viewTable = (selectedTable === "__recent__" && selectedRow?.table_name)
    ? String(selectedRow.table_name)
    : (selectedTable || "");

  // When in Recent Activity: show preview instantly, fetch full row in background, no tabs
  const handleRowSelect = useCallback((row: TableRow) => {
    if (selectedTable === "__recent__" && row.schema_name && row.table_name) {
      const schema = String(row.schema_name) as SchemaName;
      const table = String(row.table_name);
      // Show preview immediately — no waiting
      setSelectedRow(row);
      setHash(schema, table, row.id as string | number);
      // Fetch full row in background, swap in when ready (preserve source fields for viewSchema/viewTable)
      supabase.rpc("pg_get_row", {
        p_schema: schema,
        p_table: table,
        row_id: String(row.id),
      }).then(({ data }) => {
        if (data) setSelectedRow({ ...(data as TableRow), schema_name: schema, table_name: table });
      });
    } else {
      setSelectedRow(row);
    }
  }, [selectedTable]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh current table
  const handleRefresh = () => {
    if (selectedTable === "__recent__") {
      setLoading(true);
      supabase.rpc("pg_master_feed", { row_limit: 100 })
        .then(({ data }) => {
          if (data) setRows(data as TableRow[]);
          setLoading(false);
        });
      return;
    }
    if (selectedTable) {
      loadRows(selectedSchema, selectedTable);
    }
  };

  // Navigate from master feed
  const navigateFromFeed = useCallback(async (schema: string, table: string, id: string) => {
    const s = schema as SchemaName;
    setSelectedSchema(s);
    setSelectedTable(table);
    // Load rows and select the specific one
    const { data } = await supabase.rpc("pg_query_table", {
      p_schema: schema,
      p_table: table,
      row_limit: 100,
    });
    if (data) {
      setRows(data as TableRow[]);
      const match = (data as TableRow[]).find((r) => String(r.id) === id);
      if (match) {
        setSelectedRow(match);
        const tabId = match.id as string | number;
        const title = getTitle(match, fkLookups);
        if (!openTabs.find((t) => t.id === tabId && t.schema === s && t.table === table)) {
          setOpenTabs((prev) => [...prev, { schema: s, table, row: match, id: tabId, title }]);
        }
        setActiveTabId(tabId);
        setHash(schema, table, tabId);
      }
    }
  }, [fkLookups, openTabs]);

  // Tab management
  const openTab = async (row: TableRow) => {
    // If from master feed, fetch the full row from its original table but STAY in recent activity
    if (selectedTable === "__recent__" && row.schema_name && row.table_name) {
      const schema = String(row.schema_name) as SchemaName;
      const table = String(row.table_name);
      const rowId = String(row.id);

      // Fetch full row content from the original table
      const { data } = await supabase.rpc("pg_get_row", {
        p_schema: schema,
        p_table: table,
        row_id: rowId,
      });

      const fullRow = (data as TableRow) || row;
      const id = fullRow.id as string | number;
      const title = getTitle(fullRow, fkLookups) || getTitle(row, fkLookups);
      const existing = openTabs.find((t) => t.id === id && t.schema === schema && t.table === table);
      if (existing) {
        setActiveTabId(id);
      } else {
        setOpenTabs((prev) => [...prev, { schema, table, row: fullRow, id, title }]);
        setActiveTabId(id);
      }
      setSelectedRow(fullRow);
      setHash(schema, table, id);
      return;
    }

    const id = row.id as string | number;
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
    // On mobile, push to content view
    if (!isDesktop) {
      pushTo("content");
    }
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
    // Don't navigate away from Recent Activity — viewSchema/viewTable handle display
    if (selectedTable !== "__recent__") {
      setSelectedSchema(tab.schema);
      setSelectedTable(tab.table);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const activeTab = openTabs.find((t) => t.id === activeTabId && t.schema === selectedSchema && t.table === selectedTable)
    || openTabs.find((t) => t.id === activeTabId);

  // Mobile: select table from sidebar -> push to list
  const handleSelectTableMobile = (table: string | null) => {
    setSelectedTable(table);
    if (!isDesktop) {
      setMobileSidebarOpen(false);
      pushTo("list");
    }
  };

  // Mobile: select row -> push to content
  const handleSelectRowMobile = (row: TableRow) => {
    handleRowSelect(row);
    if (!isDesktop) pushTo("content");
  };

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

  // ----- Mobile phone layout: single panel at a time -----
  if (isPhone) {
    return (
      <div className="flex flex-col h-[100dvh]">
        {/* Mobile sidebar drawer overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 bg-zinc-900 border-r border-zinc-800 z-50 shadow-2xl overflow-y-auto">
              <Sidebar
                user={user}
                setUser={setUser}
                tables={tables}
                selectedSchema={selectedSchema}
                setSelectedSchema={setSelectedSchema}
                selectedTable={selectedTable}
                setSelectedTable={handleSelectTableMobile}
                setSelectedRow={setSelectedRow}
                setRows={setRows}
              />
            </div>
          </div>
        )}

        {/* Mobile TOC bottom sheet */}
        {mobileTocOpen && selectedRow && contentField && toc.length > 0 && (
          <div className="fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileTocOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-zinc-900 border-t border-zinc-700 rounded-t-2xl z-50 overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-300">On this page</h3>
                <button
                  onClick={() => setMobileTocOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-lg w-8 h-8 flex items-center justify-center"
                >
                  x
                </button>
              </div>
              <nav className="p-4">
                {toc.map((item, i) => (
                  <a
                    key={`${item.slug}-${i}`}
                    href={`#${item.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileTocOpen(false);
                      setTimeout(() => {
                        document.getElementById(item.slug)?.scrollIntoView({ behavior: "smooth" });
                      }, 200);
                    }}
                    className={`block py-2.5 text-sm transition-colors ${
                      item.level === 1
                        ? "text-zinc-200 font-medium"
                        : item.level === 2
                        ? "text-zinc-400"
                        : "text-zinc-500"
                    } ${
                      item.level === 1 ? "" : item.level === 2 ? "pl-4" : item.level === 3 ? "pl-8" : "pl-12"
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main content area: single panel based on mobileView */}
        <div className="flex-1 overflow-hidden">
          {mobileView === "sidebar" && (
            <div className="h-full flex flex-col">
              <Sidebar
                user={user}
                setUser={setUser}
                tables={tables}
                selectedSchema={selectedSchema}
                setSelectedSchema={setSelectedSchema}
                selectedTable={selectedTable}
                setSelectedTable={handleSelectTableMobile}
                setSelectedRow={setSelectedRow}
                setRows={setRows}
                isMobileFullScreen
              />
            </div>
          )}

          {mobileView === "list" && selectedTable && (
            <div className="h-full flex flex-col">
              <MobileBackHeader
                title={selectedTable}
                subtitle={`${sortedRows.length} entries`}
                onBack={() => goBack()}
              />
              <div className="flex-1 overflow-y-auto">
                <RowList
                  selectedSchema={selectedSchema}
                  selectedTable={selectedTable}
                  rows={rows}
                  sortedRows={sortedRows}
                  filteredRowsCount={filteredRows.length}
                  selectedRow={selectedRow}
                  setSelectedRow={handleSelectRowMobile}
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
                  isMobileFullScreen
                  tableConfig={tableConfig}
                />
              </div>
            </div>
          )}

          {mobileView === "list" && !selectedTable && (
            <div className="h-full flex flex-col">
              <MobileBackHeader
                title="Tables"
                onBack={() => goBack()}
              />
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
                Select a table from the sidebar
              </div>
            </div>
          )}

          {mobileView === "content" && (
            <div className="h-full flex flex-col">
              <MobileBackHeader
                title={selectedRow ? getTitle(selectedRow, fkLookups) : "Content"}
                subtitle={viewTable ? `${viewSchema} / ${viewTable}` : undefined}
                onBack={() => goBack()}
              />
              <div className="flex-1 overflow-y-auto">
                {selectedRow ? (
                  <ContentViewer
                    selectedRow={selectedRow}
                    selectedSchema={viewSchema}
                    selectedTable={viewTable}
                    fkLookups={fkLookups}
                    headingComponents={headingComponents}
                    onFilterClick={(column, value) => {
                      if (column === "tags") {
                        setFilterTag(value);
                      } else {
                        setFilters([{ column, operator: "equals", value }]);
                        setShowFilters(true);
                      }
                      pushTo("list");
                    }}
                    isMobile
                  />
                ) : (
                  <MasterFeed onNavigate={navigateFromFeed} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom navigation bar */}
        <BottomNav
          mobileView={mobileView}
          onTablesPress={() => {
            if (mobileView === "sidebar") {
              // Already on sidebar
            } else {
              setMobileSidebarOpen(true);
            }
          }}
          onSearchPress={() => {
            if (selectedTable) {
              pushTo("list");
              setTimeout(() => searchInputRef.current?.focus(), 200);
            }
          }}
          onTocPress={() => {
            if (selectedRow && toc.length > 0) {
              setMobileTocOpen(true);
            }
          }}
          onHelpPress={() => {
            document.getElementById("pgpage-help-btn")?.click();
          }}
          hasToc={!!(selectedRow && contentField && toc.length > 0)}
        />
        {/* Hidden help button for programmatic trigger */}
        <div className="hidden">
          <HelpButton id="pgpage-help-btn" />
        </div>
      </div>
    );
  }

  // ----- Tablet layout: two panels (list + content) -----
  if (isTablet) {
    return (
      <div className="flex flex-col h-[100dvh]">
        {/* Tablet sidebar drawer overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 bg-zinc-900 border-r border-zinc-800 z-50 shadow-2xl overflow-y-auto">
              <Sidebar
                user={user}
                setUser={setUser}
                tables={tables}
                selectedSchema={selectedSchema}
                setSelectedSchema={setSelectedSchema}
                selectedTable={selectedTable}
                setSelectedTable={(table) => {
                  setSelectedTable(table);
                  setMobileSidebarOpen(false);
                }}
                setSelectedRow={setSelectedRow}
                setRows={setRows}
              />
            </div>
          </div>
        )}

        {/* Tablet TOC bottom sheet */}
        {mobileTocOpen && selectedRow && contentField && toc.length > 0 && (
          <div className="fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileTocOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[60vh] bg-zinc-900 border-t border-zinc-700 rounded-t-2xl z-50 overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-300">On this page</h3>
                <button
                  onClick={() => setMobileTocOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-lg w-8 h-8 flex items-center justify-center"
                >
                  x
                </button>
              </div>
              <nav className="p-4">
                {toc.map((item, i) => (
                  <a
                    key={`${item.slug}-${i}`}
                    href={`#${item.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileTocOpen(false);
                      setTimeout(() => {
                        document.getElementById(item.slug)?.scrollIntoView({ behavior: "smooth" });
                      }, 200);
                    }}
                    className={`block py-2 text-sm transition-colors ${
                      item.level === 1
                        ? "text-zinc-200 font-medium"
                        : item.level === 2
                        ? "text-zinc-400"
                        : "text-zinc-500"
                    } ${
                      item.level === 1 ? "" : item.level === 2 ? "pl-4" : item.level === 3 ? "pl-8" : "pl-12"
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Two-panel layout: list + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Row list */}
          {selectedTable && (
            <RowList
              selectedSchema={selectedSchema}
              selectedTable={selectedTable}
              rows={rows}
              sortedRows={sortedRows}
              filteredRowsCount={filteredRows.length}
              selectedRow={selectedRow}
              setSelectedRow={handleRowSelect}
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
              tableConfig={tableConfig}
            />
          )}

          {/* Content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
                  selectedTable={viewTable}
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
                <MasterFeed onNavigate={navigateFromFeed} />
              )}
            </div>
          </div>
        </div>

        {/* Bottom nav for tablet */}
        <BottomNav
          mobileView={mobileView}
          onTablesPress={() => setMobileSidebarOpen(true)}
          onSearchPress={() => {
            if (selectedTable) {
              setTimeout(() => searchInputRef.current?.focus(), 200);
            }
          }}
          onTocPress={() => {
            if (selectedRow && toc.length > 0) {
              setMobileTocOpen(true);
            }
          }}
          onHelpPress={() => {
            document.getElementById("pgpage-help-btn-tablet")?.click();
          }}
          hasToc={!!(selectedRow && contentField && toc.length > 0)}
        />
        <div className="hidden">
          <HelpButton id="pgpage-help-btn-tablet" />
        </div>
      </div>
    );
  }

  // ----- Desktop layout: unchanged three-panel -----
  return (
    <div className="flex h-screen">
      {/* Panel toggle bar */}
      <div className="flex-shrink-0 w-10 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center pt-3 gap-2">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={`w-7 h-7 rounded flex items-center justify-center text-xs ${showSidebar ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800"}`}
          title="Toggle schemas/tables"
        >
          &#9776;
        </button>
        <button
          onClick={() => setShowRowList(!showRowList)}
          className={`w-7 h-7 rounded flex items-center justify-center text-xs ${showRowList ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800"}`}
          title="Toggle row list"
        >
          &#8801;
        </button>
        <button
          onClick={() => setShowToc(!showToc)}
          className={`w-7 h-7 rounded flex items-center justify-center text-xs ${showToc ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800"}`}
          title="Toggle table of contents"
        >
          &para;
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
          setSelectedRow={handleRowSelect}
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
          tableConfig={tableConfig}
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
              selectedSchema={viewSchema}
              selectedTable={viewTable}
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
            <MasterFeed onNavigate={navigateFromFeed} />
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
