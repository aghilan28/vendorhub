import { requireRole } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rootCategories, taxonomyNodes } from "./taxonomy";

export interface CatalogRealitySnapshot {
  configured: boolean;
  taxonomy: { roots: number; total: number };
  live: {
    products: number;
    activeProducts: number;
    categories: number;
    productsWithImages: number;
    inventoryRows: number;
    coveragePercent: number;
  };
}

function empty(configured: boolean): CatalogRealitySnapshot {
  return {
    configured,
    taxonomy: { roots: rootCategories.length, total: taxonomyNodes.length },
    live: { products: 0, activeProducts: 0, categories: 0, productsWithImages: 0, inventoryRows: 0, coveragePercent: 0 },
  };
}

/** Live catalog counts (admin-gated). Honest empty snapshot when unconfigured. */
export async function getCatalogRealitySnapshot(): Promise<CatalogRealitySnapshot> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return empty(false);
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const supabase = await createSupabaseServerClient();

  const head = { count: "exact" as const, head: true };
  const [products, active, categories, images, inventory] = await Promise.all([
    supabase.from("products").select("id", head),
    supabase.from("products").select("id", head).eq("status", "ACTIVE"),
    supabase.from("categories").select("id", head),
    supabase.from("product_images").select("product_id", head),
    supabase.from("inventory").select("id", head),
  ]);

  const productCount = products.count ?? 0;
  return {
    configured: true,
    taxonomy: { roots: rootCategories.length, total: taxonomyNodes.length },
    live: {
      products: productCount,
      activeProducts: active.count ?? 0,
      categories: categories.count ?? 0,
      productsWithImages: images.count ?? 0,
      inventoryRows: inventory.count ?? 0,
      coveragePercent: productCount ? Math.round(((images.count ?? 0) / productCount) * 100) : 0,
    },
  };
}
