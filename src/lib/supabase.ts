import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type SchemaName = "memdb" | "sessiondb" | "worlddb" | "yasin_info";

export const SCHEMAS: { name: SchemaName; label: string }[] = [
  { name: "memdb", label: "Memory DB" },
  { name: "sessiondb", label: "Sessions" },
  { name: "worlddb", label: "World DB" },
  { name: "yasin_info", label: "Yasin Info" },
];

export type TableConfig = Record<string, { dateColumn: string }>;

export async function loadTableConfig(): Promise<TableConfig> {
  const { data, error } = await supabase.schema("pgpage").from("table_config").select("*");
  if (error || !data) return {};
  const config: TableConfig = {};
  for (const row of data) {
    config[`${row.schema_name}.${row.table_name}`] = { dateColumn: row.date_column };
  }
  return config;
}
