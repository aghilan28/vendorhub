"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = assertSupabasePublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
