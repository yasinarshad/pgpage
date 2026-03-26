import type { TableRow, TocItem, FilterRule, ColType } from "./types";
import { WORKSPACES, findWorkspaceBySchema } from "./workspaces";

export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split("\n");
  const toc: TocItem[] = [];
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*`_~]/g, "");
      const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      toc.push({ level, text, slug });
    }
  }
  return toc;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function getContentField(row: TableRow): string | null {
  // These fields are rendered in collapsible sections, not as main content
  const collapsibleOnly = new Set(["yasin_notes", "key_takeaways", "raw_notes", "synthesis"]);
  // Check for actual content fields first (from full row fetches)
  for (const key of ["content", "summary", "decision", "description", "question", "transcript"]) {
    if (collapsibleOnly.has(key)) continue;
    if (row[key] && typeof row[key] === "string" && (row[key] as string).length > 30) {
      return key;
    }
  }
  // Fallback for master feed preview
  if (row.preview && typeof row.preview === "string" && (row.preview as string).length > 10) {
    return "preview";
  }
  return null;
}

export function getTitle(row: TableRow, fkMap?: Record<string, Record<string, string>>): string {
  for (const key of ["title", "database_title", "name", "person_name", "category", "question", "subject"]) {
    if (row[key] && typeof row[key] === "string" && (row[key] as string).length > 0) {
      return row[key] as string;
    }
  }
  const content = getContentField(row);
  if (content && typeof row[content] === "string") {
    return (row[content] as string).slice(0, 60) + "...";
  }
  if (fkMap) {
    for (const [col, lookup] of Object.entries(fkMap)) {
      const val = String(row[col] || "");
      if (lookup[val]) return lookup[val];
    }
  }
  return `Row ${row.id}`;
}

export function resolveValue(col: string, value: unknown, fkMap: Record<string, Record<string, string>>): string {
  const s = String(value ?? "");
  if (fkMap[col]?.[s]) return `${fkMap[col][s]}`;
  return s;
}

export function parseHash(): { workspaceId?: string; schema?: string; table?: string; id?: string | number } {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.slice(1);
  if (!hash) return {};
  const parts = hash.split("/");

  // Detect format: new = #workspaceId/schema/table/id, old = #schema/table/id
  // If first segment matches a known schema from ANY workspace, treat as old format -> default to yasin-brain
  const firstSegment = parts[0];
  const matchedBySchema = findWorkspaceBySchema(firstSegment);

  let workspaceId: string | undefined;
  let schema: string | undefined;
  let table: string | undefined;
  let rawId: string | undefined;

  if (matchedBySchema) {
    // Old format: #schema/table/id — backwards compat, default to workspace that owns this schema
    workspaceId = matchedBySchema.id;
    schema = parts[0];
    table = parts[1];
    rawId = parts[2];
  } else {
    // New format: #workspaceId/schema/table/id
    const ws = WORKSPACES.find((w) => w.id === firstSegment);
    if (ws) {
      workspaceId = ws.id;
      schema = parts[1];
      table = parts[2];
      rawId = parts[3];
    } else {
      // Unknown first segment — treat as schema for backwards compat
      schema = parts[0];
      table = parts[1];
      rawId = parts[2];
    }
  }

  let id: string | number | undefined;
  if (rawId) {
    const asNum = parseInt(rawId, 10);
    id = String(asNum) === rawId ? asNum : rawId;
  }

  return { workspaceId, schema, table, id };
}

export function setHash(workspaceId: string, schema: string, table?: string, id?: string | number) {
  const parts = [workspaceId, schema];
  if (table) parts.push(table);
  if (id != null) parts.push(String(id));
  window.history.replaceState(null, "", `#${parts.join("/")}`);
}

export function detectColType(value: unknown): ColType {
  if (value === null || value === undefined) return "unknown";
  if (Array.isArray(value)) return "array";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  }
  return "text";
}

export function applyFilter(row: TableRow, filter: FilterRule): boolean {
  const val = row[filter.column];
  const filterVal = filter.value.toLowerCase();

  switch (filter.operator) {
    case "contains":
      if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(filterVal));
      return String(val || "").toLowerCase().includes(filterVal);
    case "equals":
      return String(val || "").toLowerCase() === filterVal;
    case "starts_with":
      return String(val || "").toLowerCase().startsWith(filterVal);
    case "not_empty":
      return val != null && val !== "" && !(Array.isArray(val) && val.length === 0);
    case "is_empty":
      return val == null || val === "" || (Array.isArray(val) && val.length === 0);
    case "eq":
      return Number(val) === Number(filter.value);
    case "gt":
      return Number(val) > Number(filter.value);
    case "lt":
      return Number(val) < Number(filter.value);
    case "gte":
      return Number(val) >= Number(filter.value);
    case "lte":
      return Number(val) <= Number(filter.value);
    case "after":
      return new Date(String(val)) > new Date(filter.value);
    case "before":
      return new Date(String(val)) < new Date(filter.value);
    case "is_true":
      return val === true;
    case "is_false":
      return val === false;
    default:
      return true;
  }
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function readingTime(words: number): number {
  return Math.max(1, Math.ceil(words / 250));
}

export function getCreatorName(row: TableRow, fkLookups: Record<string, Record<string, string>>): string | null {
  // Try common FK columns for creator
  for (const col of ["creator_id", "author_id", "user_id", "created_by"]) {
    const val = String(row[col] ?? "");
    if (fkLookups[col]?.[val]) return fkLookups[col][val];
  }
  // Also check person_name, author directly
  for (const col of ["person_name", "author", "creator"]) {
    if (row[col] && typeof row[col] === "string") return row[col] as string;
  }
  return null;
}
