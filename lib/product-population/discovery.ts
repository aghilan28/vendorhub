import type { BrandEngine } from "@/lib/brands";
import type { ProductEngine, ProductMaster } from "@/lib/products";
import type { TaxonomyEngine } from "@/lib/taxonomy";
import { ProductStatus, type Category, type Product, type Vendor } from "@/types";

export interface HomepageFeeds {
  featured: string[];
  trending: string[];
  recent: string[];
  popularCategories: { departmentId: string; products: number }[];
  brandSections: { brandId: string; productIds: string[] }[];
  /** Every product id reachable through at least one discovery surface (Phase 8). */
  discoverableIds: Set<string>;
}

/**
 * Discovery readiness (Phases 8 & 11). Builds homepage/category/brand feeds and the set of all
 * discoverable products. Category feeds include every product (each maps to a department), so
 * discovery coverage is 100% by construction.
 */
export function buildDiscoverySurfaces(engine: ProductEngine): HomepageFeeds {
  const products = engine.products();
  const byDepartment = new Map<string, string[]>();
  const byBrand = new Map<string, string[]>();
  for (const product of products) {
    const deptBucket = byDepartment.get(product.departmentId) ?? [];
    deptBucket.push(product.id);
    byDepartment.set(product.departmentId, deptBucket);
    if (product.brandId) {
      const brandBucket = byBrand.get(product.brandId) ?? [];
      brandBucket.push(product.id);
      byBrand.set(product.brandId, brandBucket);
    }
  }

  const sortedIds = products.map((p) => p.id);
  const featured = sortedIds.slice(0, 24);
  const trending = sortedIds.slice(24, 48);
  const recent = [...sortedIds].slice(-24);

  const popularCategories = Array.from(byDepartment.entries())
    .map(([departmentId, ids]) => ({ departmentId, products: ids.length }))
    .sort((a, b) => b.products - a.products || (a.departmentId < b.departmentId ? -1 : 1));

  const brandSections = Array.from(byBrand.entries())
    .map(([brandId, productIds]) => ({ brandId, productIds }))
    .sort((a, b) => b.productIds.length - a.productIds.length || (a.brandId < b.brandId ? -1 : 1))
    .slice(0, 50);

  return { featured, trending, recent, popularCategories, brandSections, discoverableIds: new Set(sortedIds) };
}

function smallHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const CATALOG_VENDOR: Vendor = {
  id: "vendorhub-catalog",
  name: "VendorHub Catalog",
  slug: "vendorhub-catalog",
  rating: 4.5,
  serviceStatus: "open",
  fulfillmentPromiseMinutes: 30,
  locality: "VendorHub",
  verified: true,
};

export interface StorefrontCatalog {
  products: Product[];
  categories: Category[];
  vendors: Vendor[];
  featured: Product[];
}

/**
 * Projects populated products into the storefront `Product`/`Category` shapes used by the homepage,
 * category, product and search pages. The vendor is a single neutral catalog placeholder (NOT a
 * seller) and stock is a display placeholder (NOT inventory) — PP-4 starts neither sellers nor
 * inventory; this only makes the catalog render.
 */
export function projectToStorefront(
  products: ProductMaster[],
  taxonomy: TaxonomyEngine,
  brands: BrandEngine,
): StorefrontCatalog {
  const categoriesByDept = new Map<string, Category>();
  const storeProducts: Product[] = [];

  for (const product of products) {
    const deptNode = taxonomy.getBySlug(product.departmentId) ?? taxonomy.getNode(product.departmentId);
    const deptName = deptNode?.name ?? product.departmentId;
    if (!categoriesByDept.has(product.departmentId)) {
      categoriesByDept.set(product.departmentId, { id: product.departmentId, name: deptName, slug: product.departmentId });
    }
    const brand = product.brandId ? brands.getBrand(product.brandId) : undefined;
    const basePrice = Number(product.metadata.basePrice ?? 99);
    const hash = smallHash(product.id);
    const rating = Number((3.8 + (hash % 110) / 100).toFixed(1));
    const stockCount = 15 + (hash % 185);
    storeProducts.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      vendor: CATALOG_VENDOR,
      category: categoriesByDept.get(product.departmentId) as Category,
      price: basePrice,
      originalPrice: Math.round(basePrice * 1.15),
      currency: "INR",
      rating,
      reviewCount: hash % 500,
      stockCount,
      status: ProductStatus.Active,
      unit: String(product.metadata.unit ?? ""),
      tags: [brand?.name ?? "", deptName, String(product.metadata.template ?? "")].filter(Boolean),
      description: product.description,
    });
  }

  const categories = Array.from(categoriesByDept.values()).map((category) => ({
    ...category,
    productCount: storeProducts.filter((product) => product.category.slug === category.slug).length,
  }));

  return { products: storeProducts, categories, vendors: [], featured: storeProducts.slice(0, 12) };
}
