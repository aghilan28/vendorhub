import { requireUser } from "@/lib/api/auth";
import { mapProductRowToProduct, type ProductListRow } from "@/lib/api/mappers/products";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

type WishlistRow = {
  product: ProductListRow | ProductListRow[] | null;
};

export async function listLiveWishlistProducts(): Promise<Product[]> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select(
      `
        product:products(
          id,
          name,
          slug,
          description,
          status,
          base_price,
          currency,
          ai_index_metadata,
          discovery_metadata,
          vendor:vendors(id, name, slug, rating_average, rating_count, service_radius_km, status, metadata),
          category:categories(id, name, slug, description, image_url),
          images:product_images(storage_path, alt_text, is_primary),
          inventory(stock_quantity, reserved_quantity, low_stock_threshold, stock_status),
          reviews(rating)
        )
      `,
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as WishlistRow[]).flatMap((item) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    return product ? [mapProductRowToProduct(product)] : [];
  });
}

export async function listLiveWishlistIds() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("wishlists").select("product_id").eq("user_id", user.id).is("deleted_at", null);

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => item.product_id);
}
