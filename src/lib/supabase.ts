import { createClient, SupabaseClient } from "@supabase/supabase-js";

const clientCache = new Map<string, SupabaseClient>();

export function getSupabaseClient(url: string, anonKey: string): SupabaseClient {
  const cacheKey = url;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createClient(url, anonKey));
  }
  return clientCache.get(cacheKey)!;
}

// Default client for backwards compat during transition
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
