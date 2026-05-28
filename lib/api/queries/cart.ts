import { requireUser } from "@/lib/api/auth";
import { mapProductRowToProduct, type ProductListRow } from "@/lib/api/mappers/products";
import { env } from "@/lib/env";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CartItem } from "@/types";

type CartRow = {
  id: string;
  quantity: number;
  reserved_until: string | null;
  product: ProductListRow | ProductListRow[] | null;
};

export async function listLiveCartItems(): Promise<CartItem[]> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return fallbackCartItems();
  }

  const user = await requireUser().catch(() => null);
  if (!user) return fallbackCartItems();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `
        id,
        quantity,
        reserved_until,
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
          inventory(stock_quantity, reserved_quantity, low_stock_threshold, stock_status)
        )
      `,
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return fallbackCartItems();
  }

  return ((data ?? []) as unknown as CartRow[]).flatMap((item) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    return product
      ? [
          {
            id: item.id,
            product: mapProductRowToProduct(product),
            quantity: item.quantity,
            reservedUntil: item.reserved_until ?? undefined,
          },
        ]
      : [];
  });
}

function fallbackCartItems(): CartItem[] {
  return marketplaceProducts.slice(0, 0).map((product, index) => ({
    id: `fallback-cart-${product.id}`,
    product,
    quantity: index + 1,
  }));
}
