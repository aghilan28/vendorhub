import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AsyncQueryResult = PromiseLike<{ data: unknown; error: unknown }>;
type AsyncQueryBuilder = PromiseLike<{ data: unknown; error: unknown }> & {
  select: (columns?: string) => AsyncQueryBuilder;
  eq: (column: string, value: unknown) => AsyncQueryBuilder;
  maybeSingle: () => AsyncQueryResult;
  single: () => AsyncQueryResult;
  upsert: (values: unknown, options?: Record<string, unknown>) => AsyncQueryBuilder;
  update: (values: unknown) => AsyncQueryBuilder;
};

type UnsafeSupabase = ReturnType<typeof createSupabaseAdminClient> & {
  from: (relation: string) => AsyncQueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => AsyncQueryResult;
};

export function createAsyncSupabaseClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}
