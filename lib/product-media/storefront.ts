import { buildStorefrontCatalog, type StorefrontCatalog } from "@/lib/product-population";
import { thumbnailFor } from "./thumbnails";
import { mediaUrl } from "./urls";

let cached: StorefrontCatalog | null = null;

/**
 * Media activation (Phase 8). Enriches the PP-4 storefront catalog with deterministic image URLs so
 * the homepage / category / product / search surfaces render real media (no blank cards). Does not
 * modify PP-4 product records — it enriches the display projection only. Cached per process.
 */
export function buildMediaActivatedStorefront(): StorefrontCatalog {
  if (cached) return cached;
  const base = buildStorefrontCatalog();
  const products = base.products.map((product) => ({ ...product, imageUrl: thumbnailFor(product.id, "CARD") }));
  const featured = base.featured.map((product) => ({ ...product, imageUrl: thumbnailFor(product.id, "STOREFRONT") }));
  const categories = base.categories.map((category) => ({ ...category, imageUrl: mediaUrl(`category-${category.slug}`, 400, 300) }));
  cached = { products, categories, vendors: base.vendors, featured };
  return cached;
}
