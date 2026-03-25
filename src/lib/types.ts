export type TableRow = Record<string, unknown>;

export type Tab = {
  schema: string;
  table: string;
  row: TableRow;
  id: string | number;
  title: string;
};

export type TocItem = { level: number; text: string; slug: string };

export type FilterRule = {
  column: string;
  operator: string;
  value: string;
};

export type ColType = "text" | "number" | "date" | "array" | "boolean" | "unknown";

export const OPERATORS: Record<ColType, { value: string; label: string }[]> = {
  text: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "starts_with", label: "starts with" },
    { value: "not_empty", label: "is not empty" },
    { value: "is_empty", label: "is empty" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
    { value: "gte", label: ">=" },
    { value: "lte", label: "<=" },
  ],
  date: [
    { value: "after", label: "after" },
    { value: "before", label: "before" },
    { value: "equals", label: "equals" },
  ],
  array: [
    { value: "contains", label: "contains" },
    { value: "not_empty", label: "is not empty" },
    { value: "is_empty", label: "is empty" },
  ],
  boolean: [
    { value: "is_true", label: "is true" },
    { value: "is_false", label: "is false" },
  ],
  unknown: [
    { value: "not_empty", label: "is not empty" },
    { value: "is_empty", label: "is empty" },
  ],
};
