import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type UnsafeSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>> & {
  from: (relation: string) => Record<string, unknown>;
};

export async function getWishlist(userId: string) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { data, error } = await supabase
    .from("wishlists")
    .select("*, product:products(*, vendor:vendors(*), category:categories(*), images:product_images(*))")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((item) => ({
    ...item,
    available: item.product ? true : false,
  }));
}

export async function addToWishlist(userId: string, productId: string) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { data, error } = await supabase
    .from("wishlists")
    .upsert({ user_id: userId, product_id: productId, updated_at: new Date().toISOString() } as never, { onConflict: "user_id,product_id", ignoreDuplicates: true })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function removeFromWishlist(userId: string, productId: string) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { error } = await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId);
  if (error) throw error;
}
