import { requireRole } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAbsoluteUrl, resolveProductImageUrl } from "./storage";

export interface MediaGovernanceAsset {
  id: string;
  productName: string;
  url: string | null;
  storagePath: string;
  isPrimary: boolean;
}

export interface MediaGovernanceSnapshot {
  configured: boolean;
  analytics: {
    totalImages: number;
    productsTotal: number;
    productsWithImages: number;
    productsWithoutImages: number;
    coveragePercent: number;
    primaryImages: number;
    externalImages: number;
    storedImages: number;
    brokenReferences: number;
    duplicatePaths: number;
  };
  recent: MediaGovernanceAsset[];
}

function emptySnapshot(configured: boolean): MediaGovernanceSnapshot {
  return {
    configured,
    analytics: {
      totalImages: 0,
      productsTotal: 0,
      productsWithImages: 0,
      productsWithoutImages: 0,
      coveragePercent: 0,
      primaryImages: 0,
      externalImages: 0,
      storedImages: 0,
      brokenReferences: 0,
      duplicatePaths: 0,
    },
    recent: [],
  };
}

/**
 * Real, admin-gated media governance snapshot computed from `product_images`
 * and `products`. Returns an honest empty snapshot when Supabase is not
 * configured (no fabricated analytics).
 */
export async function getMediaGovernanceSnapshot(): Promise<MediaGovernanceSnapshot> {
  // No Supabase configured → no data to protect; return an honest empty snapshot.
  if (!env.supabaseUrl || !env.supabaseAnonKey) return emptySnapshot(false);
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const supabase = await createSupabaseServerClient();
  const [imagesResult, productsCount] = await Promise.all([
    supabase
      .from("product_images")
      .select("id,product_id,storage_path,is_primary,product:products(name)")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  if (imagesResult.error) return emptySnapshot(true);

  const rows = (imagesResult.data ?? []) as unknown as Array<{
    id: string;
    product_id: string;
    storage_path: string | null;
    is_primary: boolean | null;
    product: { name: string } | { name: string }[] | null;
  }>;

  const productsTotal = productsCount.count ?? 0;
  const productsWithImages = new Set(rows.map((r) => r.product_id)).size;
  const pathCounts = new Map<string, number>();
  let externalImages = 0;
  let storedImages = 0;
  let brokenReferences = 0;
  let primaryImages = 0;

  for (const row of rows) {
    const path = row.storage_path ?? "";
    if (!path) brokenReferences += 1;
    else {
      pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
      if (isAbsoluteUrl(path)) externalImages += 1;
      else storedImages += 1;
    }
    if (row.is_primary) primaryImages += 1;
  }

  const duplicatePaths = Array.from(pathCounts.values()).filter((n) => n > 1).length;
  const recent: MediaGovernanceAsset[] = rows.slice(0, 24).map((row) => {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    return {
      id: row.id,
      productName: product?.name ?? "Product",
      url: resolveProductImageUrl(row.storage_path),
      storagePath: row.storage_path ?? "",
      isPrimary: Boolean(row.is_primary),
    };
  });

  return {
    configured: true,
    analytics: {
      totalImages: rows.length,
      productsTotal,
      productsWithImages,
      productsWithoutImages: Math.max(0, productsTotal - productsWithImages),
      coveragePercent: productsTotal ? Math.round((productsWithImages / productsTotal) * 100) : 0,
      primaryImages,
      externalImages,
      storedImages,
      brokenReferences,
      duplicatePaths,
    },
    recent,
  };
}
