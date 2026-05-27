import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type UnsafeSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>> & {
  from: (relation: string) => Record<string, unknown>;
};

type CartItemRow = { product?: { vendor_id?: string; vendor?: { id?: string } } };

export class InsufficientStockError extends Error {
  code = "INSUFFICIENT_STOCK";
}

export async function getCart(userId: string) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { data, error } = await supabase
    .from("cart_items")
    .select("*, product:products(*, vendor:vendors(*), category:categories(*), images:product_images(*))")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const items = (data ?? []) as CartItemRow[];
  return {
    items,
    groups: Object.values(
      items.reduce<Record<string, { vendor_id: string; items: typeof items }>>((groups, item) => {
        const vendorId = item.product?.vendor_id ?? item.product?.vendor?.id ?? "unknown";
        groups[vendorId] ??= { vendor_id: vendorId, items: [] };
        groups[vendorId].items.push(item);
        return groups;
      }, {}),
    ),
  };
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, vendor_id")
    .eq("id", productId)
    .single();

  if (productError || !product) throw productError ?? new Error("Product not found.");
  const { data: inventory } = await supabase.from("inventory").select("stock_quantity,reserved_quantity").eq("product_id", productId).maybeSingle();
  if (((inventory?.stock_quantity ?? 0) - (inventory?.reserved_quantity ?? 0)) < quantity) throw new InsufficientStockError("INSUFFICIENT_STOCK");

  const { data, error } = await supabase.from("cart_items").upsert(
    {
      user_id: userId,
      product_id: productId,
      quantity,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id,product_id" },
  ).select().single();

  if (error) throw error;
  return data;
}

export async function updateCartItem(itemId: string, quantity: number) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { data, error } = await (supabase.from("cart_items") as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => { select: () => { single: () => Promise<{ data: unknown; error: Error | null }> } };
    };
  })
    .update({ quantity, updated_at: new Date().toISOString() } as never)
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeCartItem(itemId: string) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function clearCart(userId: string) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (error) throw error;
}
