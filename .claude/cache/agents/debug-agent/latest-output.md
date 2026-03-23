# Debug Report: Recent Activity Feature Bugs
Generated: 2026-03-22

## Symptom
The "Recent Activity" / "recent view" feature in the pgpage app is not working properly. The user navigated to https://pgpage-app.netlify.app/#sessiondb/action_log/12 and the recent view feature fails to render content correctly.

## What Recent Activity Is Supposed to Do

Recent Activity is a virtual table (__recent__) shown at the top of the sidebar. When selected, it:
1. Loads the pg_master_feed Supabase RPC (returns the 100 most recent entries across ALL schemas/tables)
2. Shows them in the RowList with source table names displayed
3. When a row is clicked, fetches the full row from its original table via pg_get_row RPC
4. Renders the full content in ContentViewer using the real schema/table (not __recent__)
5. Stays in the Recent Activity context (does not navigate away to the source table)

## Evidence

### Bug 1 (CRITICAL): pg_get_row RPC Response Likely Treated as Single Object When It Returns an Array
- Location: src/app/page.tsx:504-510
- Supabase RPCs that return SETOF json or SETOF record return an array, not a single object. If pg_get_row returns [{id: 12, content: "..."}], then data is an array, and (data as TableRow) passes the truthiness check but is actually [{...}] -- an array, not a row. The id property would be undefined, getContentField would find no content fields, and ContentViewer would show raw JSON.
- Alternative: If pg_get_row does not exist in Supabase or returns null, the fallback to the feed entry (which only has id, title, preview, tags, created_at, platform, schema_name, table_name) also lacks content fields, causing JSON display.

### Bug 2: handleRefresh Does Not Handle __recent__
- Location: src/app/page.tsx:462-466
- When selectedTable === "__recent__", handleRefresh calls loadRows which calls pg_query_table with p_table: "__recent__" -- not a real table, will fail.

### Bug 3: Search Clears Recent Activity Rows
- Location: src/app/page.tsx:270-274
- When search input is cleared and selectedTable === "__recent__", loadRows is called with "__recent__", overwriting feed data with nothing.

### Bug 4: Search RPC Fails for __recent__
- Location: src/app/page.tsx:251-267
- The debounced search calls pg_search_table with p_table: selectedTable. When __recent__, the RPC receives a non-existent table name.

### Bug 5: switchTab Navigates Away from Recent Activity
- Location: src/app/page.tsx:563-568
- switchTab sets setSelectedTable(tab.table) which replaces "__recent__" with the actual table name, triggering the useEffect that loads rows for that table.

## Root Cause Analysis

Multiple bugs, but the most critical is Bug 1: the pg_get_row response handling. Either the RPC returns an array (and the code treats it as object), or the RPC does not exist/fails and the fallback feed entry lacks content fields. Both scenarios cause ContentViewer to show raw JSON instead of rendered markdown.

Confidence: Medium-High (cannot verify Supabase function definitions from codebase)

## Recommended Fixes

All fixes are in src/app/page.tsx:

### Fix 1: Handle array response from pg_get_row (line 510)
Change: const fullRow = (data as TableRow) || row;
To: const fullRow = (Array.isArray(data) ? data[0] as TableRow : data as TableRow) || row;

### Fix 2: Handle __recent__ in handleRefresh (line 462-466)
Add __recent__ check that calls pg_master_feed instead of loadRows.

### Fix 3: Guard search effects against __recent__ (lines 246-274)
Add "if (selectedTable === '__recent__') return;" at top of both search-related effects.

### Fix 4: Prevent switchTab from leaving Recent Activity (line 563-568)
Only call setSelectedSchema/setSelectedTable when selectedTable !== "__recent__".

## Prevention
- Add error logging for failed Supabase RPC calls (currently errors are silently ignored)
- Consider a dedicated useRecentActivity hook to encapsulate virtual table logic
- Add integration tests for the Recent Activity flow
