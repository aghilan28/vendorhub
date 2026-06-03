import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listPublicBrands() {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("brands")
    .select("*")
    .is("deleted_at", null)
    .order("canonical_name", { ascending: true });
}

export async function searchBrands(query: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("brands")
    .select("*")
    .is("deleted_at", null)
    .ilike("canonical_name", `%${query}%`)
    .limit(20);
}
