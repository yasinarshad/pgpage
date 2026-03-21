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
