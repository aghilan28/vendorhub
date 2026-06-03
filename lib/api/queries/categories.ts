import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapCategoryRowToCategory } from "../mappers/categories";

export async function listPublicCategories(parentId?: string) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (parentId) {
    query = query.eq("parent_id", parentId);
  }

  return query;
}

export async function listLiveCategories() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapCategoryRowToCategory);
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();
}
