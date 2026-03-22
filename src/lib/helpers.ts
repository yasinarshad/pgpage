import type { TableRow, TocItem, FilterRule, ColType } from "./types";
import type { SchemaName } from "./supabase";
import { SCHEMAS } from "./supabase";

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
  for (const key of ["content", "summary", "decision", "description", "question", "transcript"]) {
    if (row[key] && typeof row[key] === "string" && (row[key] as string).length > 50) {
      return key;
    }
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

export function parseHash(): { schema?: SchemaName; table?: string; id?: string | number } {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.slice(1);
  if (!hash) return {};
  const parts = hash.split("/");
  const rawId = parts[2];
  let id: string | number | undefined;
  if (rawId) {
    const asNum = parseInt(rawId, 10);
    id = String(asNum) === rawId ? asNum : rawId;
  }
  return {
    schema: parts[0] as SchemaName | undefined,
    table: parts[1],
    id,
  };
}

export function setHash(schema: string, table?: string, id?: string | number) {
  const parts = [schema];
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
